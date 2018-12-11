/* @flow */

import he from 'he'
import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { parseFilters } from './filter-parser'
import { genAssignmentCode } from '../directives/model'
import { extend, cached, no, camelize } from 'shared/util'
import { isIE, isEdge, isServerRendering } from 'core/util/env'

import {
  addProp,
  addAttr,
  baseWarn,
  addHandler,
  addDirective,
  getBindingAttr,
  getAndRemoveAttr,
  pluckModuleFunction
} from '../helpers'

// onRE正则用来检测是否有@符号或者v-on:(属性中绑定事件)。
export const onRE = /^@|^v-on:/
// dirRE正则用来检测是否是指令，以v-或者@(v-on:)或者:(v-bind:)开头。
export const dirRE = /^v-|^@|^:/
// forAliasRE用来匹配v-for里的属性值，如item in list, item of list。
// 有两个捕获组，第一个捕获组匹配item，第二个捕获到list。
export const forAliasRE = /([^]*?)\s+(?:in|of)\s+([^]*)/
// forIteratorRE用来匹配forAliasRE第一个捕获组的结果。
// 如(item, index)，或者(value, key, index)。
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
// 匹配(开头)结尾的正则。用于将(item, index)去除括号成为item, index。
const stripParensRE = /^\(|\)$/g
// argRE正则用于匹配指令中的参数，如v-on:click.stop中的click.stop。
const argRE = /:(.*)$/
// bindRE正则用于匹配:或者vbind:开头的字符串。
export const bindRE = /^:|^v-bind:/
// modifierRE正则用于匹配指令中的修饰符。如v-on:click.stop中的stop。
const modifierRE = /\.[^.]+/g

// decodeHTMLCached用于解码字符实体。
// 同时利用cached来提升性能。
const decodeHTMLCached = cached(he.decode)

// configurable state
// 可配置的状态。
export let warn: any
let delimiters
let transforms
let preTransforms
let postTransforms
let platformIsPreTag
let platformMustUseProp
let platformGetTagNamespace

type Attr = { name: string; value: string };

// 创建AST元素方法。
export function createASTElement (
  tag: string,
  attrs: Array<Attr>,
  parent: ASTElement | void
): ASTElement {
  // 返回一个对象，用来描述AST元素。
  return {
    type: 1,
    tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    parent,
    children: []
  }
}

/**
 * Convert HTML string to AST.
 */
export function parse (
  template: string,
  options: CompilerOptions
): ASTElement | undefined {
  // 如果options提供了warn方法则使用，如果没有，则使用baseWarn。
  // baseWarn定义在../helper.js种，使用console.error输出错误信息。
  warn = options.warn || baseWarn

  // 平台提供的判断是否是pre标签。如果没有提供，则使用一个始终返回false的函数。
  platformIsPreTag = options.isPreTag || no
  // 平台提供的方法，检测一个属性在标签中是否要使用元素对象原生的 prop 进行绑定，如果没有则使用一个始终返回false的函数。
  platformMustUseProp = options.mustUseProp || no
  // 平台提供的方法，获取元素(标签)的命名空间，如果没有则使用一个始终返回false的函数。
  platformGetTagNamespace = options.getTagNamespace || no

  transforms = pluckModuleFunction(options.modules, 'transformNode')
  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode')
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode')

  // 缓存options里的delimiters。
  delimiters = options.delimiters

  // 定义stack。
  const stack = []
  // 只要options.preserveWhitespace ！== false，preserveWhitespace就为true。
  const preserveWhitespace = options.preserveWhitespace !== false
  // 定义root。最后返回的也是root。
  let root
  // 定义currentParent，判断当前是在哪个父级元素里。
  let currentParent
  // 判断当前解析标签是否在v-pre标签之内。
  let inVPre = false
  // 判断当前解析标签是否在pre标签之内。
  let inPre = false
  // 定义warned，用在warnOnce方法中。
  let warned = false

  function warnOnce (msg) {
    if (!warned) {
      warned = true
      // 调用warn方法，发出警告。
      warn(msg)
    }
  }

  function closeElement (element) {
    // check pre state
    if (element.pre) {
      inVPre = false
    }
    if (platformIsPreTag(element.tag)) {
      inPre = false
    }
    // apply post-transforms
    for (let i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options)
    }
  }
  // 在这行下面插入parseHTML。
  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    start (tag, attrs, unary) {
      // check namespace.
      // inherit parent ns if there is one
      // 检查命名空间，如果父级有命名空间则继承父级的。
      const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)

      // handle IE svg bug
      // 处理IE的svg bug。
      /* istanbul ignore if */
      if (isIE && ns === 'svg') {
        // 调用guardIESVGBug方法处理这个bug。
        // 在IE中，svg属性会渲染多余的属性。
        attrs = guardIESVGBug(attrs)
      }

      // 创建一个AST元素。
      let element: ASTElement = createASTElement(tag, attrs, currentParent)
      if (ns) {
        // 如果存在命名空间，则给element添加一个ns属性和相应的值。
        // 只有svg和math标签或者他们的子节点，才会添加ns属性和值。
        element.ns = ns
      }

      if (isForbiddenTag(element) && !isServerRendering()) {
        // 判断在非服务端渲染的环境里，element是否是被禁止的。
        // script和style是被禁止的，不允许被放至在模板当中。
        // 不过script里不是js，如type="text/x-template"时，不被禁止。
        // 向element中添加forbidden属性，值为true。
        element.forbidden = true
        process.env.NODE_ENV !== 'production' && warn(
          'Templates should only be responsible for mapping the state to the ' +
          'UI. Avoid placing tags with side-effects in your templates, such as ' +
          `<${tag}>` + ', as they will not be parsed.'
          // 模板应当只负责映射UI的状态，避免在你的模板里放置有副作用的标签，比如说${tag}，他们将不会被解析。
        )
      }

      // apply pre-transforms
      // 
      for (let i = 0; i < preTransforms.length; i++) {
        element = preTransforms[i](element, options) || element
      }

      if (!inVPre) {
        processPre(element)
        if (element.pre) {
          inVPre = true
        }
      }
      if (platformIsPreTag(element.tag)) {
        inPre = true
      }
      if (inVPre) {
        processRawAttrs(element)
      } else if (!element.processed) {
        // structural directives
        processFor(element)
        processIf(element)
        processOnce(element)
        // element-scope stuff
        processElement(element, options)
      }

      function checkRootConstraints (el) {
        // 检查根元素的限制条件。
        if (process.env.NODE_ENV !== 'production') {
          // 非生产条件下，提出警告。
          if (el.tag === 'slot' || el.tag === 'template') {
            // 不能使用slot或者template作为根元素。
            warnOnce(
              `Cannot use <${el.tag}> as component root element because it may ` +
              'contain multiple nodes.'
              // 不能使用slot或者template作为根元素因为她们可能会包含多个节点。
            )
          }
          if (el.attrsMap.hasOwnProperty('v-for')) {
            // 当根元素包含v-for属性时，发出警告。
            warnOnce(
              'Cannot use v-for on stateful component root element because ' +
              'it renders multiple elements.'
              // 不能使用一个有v-for状态的组件根元素因为它渲染多个元素。
            )
          }
        }
      }

      // tree management
      if (!root) {
        // 如果根元素不存在，则说明当前element就是根元素，直接将element赋值给root。
        root = element
        // 检查根元素的限制条件。
        checkRootConstraints(root)
      } else if (!stack.length) {
        // allow root elements with v-if, v-else-if and v-else
        // 允许根元素使用v-if，v-else-if，v-else。
        if (root.if && (element.elseif || element.else)) {
          // root.if属性存在说明根元素使用了v-if指令。
          // element.elseif或者element.else说明当前element描述对象是使用了v-else-if或者v-else指令。
          // if，elseif，else属性是通过processIf函数处理元素描述对象添加的。
          // 检查element是否符合作为根元素的限制条件。
          checkRootConstraints(element)
          // 将elseif对应的元素描述对象，添加到根元素root的ifConditions属性中。
          addIfCondition(root, {
            exp: element.elseif,
            block: element
          })
        } else if (process.env.NODE_ENV !== 'production') {
          // 在非生产环境下。提出警告。
          warnOnce(
            `Component template should contain exactly one root element. ` +
            `If you are using v-if on multiple elements, ` +
            `use v-else-if to chain them instead.`
            // 组件模板只能包含一个根元素。
            // 如果你正在多个元素上使用v-if，可以用v-else-if将他们链接起来。
          )
        }
      }
      if (currentParent && !element.forbidden) {
        // 如果currentParent存在，说明当前元素描述对象存在父级。且当前元素描述对象不是被禁止的。
        if (element.elseif || element.else) {
          // 如果元素使用了v-else-if或者v-else指令。则使用processIfConditions函数处理。
          processIfConditions(element, currentParent)
        } else if (element.slotScope) { // scoped slot
          // 如果element有slotScope属性。则将父级元素描述对象的plain属性变成false。
          currentParent.plain = false
          // 获取当前元素描述对象的slotTarget属性，没有就赋值为default。
          const name = element.slotTarget || '"default"'
          // 对父级元素描述对象的scopedSlots属性进行处理。
          // 如果没有，则初始化为一个空对象，同时将该对象的name属性指向当前元素描述对象。
          // 所以slotScope其实也不是将元素放置在父级元素的children，而是放置是scopedSlot属性中。
          (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element
        } else {
          // 将当前元素描述对象push进入currentParent父级元素描述对象的children数组中。
          currentParent.children.push(element)
          // 同时把当前元素描述对象的parent属性指向父级元素描述对象。
          // 这样就建立了元素间父子包含的关系。
          element.parent = currentParent
        }
      }
      if (!unary) {
        // 如果当前描述对象为非一元标签。
        // 将element赋值给currentParent。
        currentParent = element
        // 将element元素描述对象push进stack数组中。
        stack.push(element)
      } else {
        // 如果是一元标签，调用closeElement函数。
        closeElement(element)
      }
    },

    end () {
      // remove trailing whitespace
      const element = stack[stack.length - 1]
      const lastNode = element.children[element.children.length - 1]
      if (lastNode && lastNode.type === 3 && lastNode.text === ' ' && !inPre) {
        element.children.pop()
      }
      // pop stack
      stack.length -= 1
      currentParent = stack[stack.length - 1]
      closeElement(element)
    },

    chars (text: string) {
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production') {
          if (text === template) {
            warnOnce(
              'Component template requires a root element, rather than just text.'
            )
          } else if ((text = text.trim())) {
            warnOnce(
              `text "${text}" outside root element will be ignored.`
            )
          }
        }
        return
      }
      // IE textarea placeholder bug
      /* istanbul ignore if */
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        return
      }
      const children = currentParent.children
      text = inPre || text.trim()
        ? isTextTag(currentParent) ? text : decodeHTMLCached(text)
        // only preserve whitespace if its not right after a starting tag
        : preserveWhitespace && children.length ? ' ' : ''
      if (text) {
        let res
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          children.push({
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text
          })
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          children.push({
            type: 3,
            text
          })
        }
      }
    },
    comment (text: string) {
      currentParent.children.push({
        type: 3,
        text,
        isComment: true
      })
    }
  })
  return root
}

function processPre (el) {
  if (getAndRemoveAttr(el, 'v-pre') != null) {
    el.pre = true
  }
}

function processRawAttrs (el) {
  const l = el.attrsList.length
  if (l) {
    const attrs = el.attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      attrs[i] = {
        name: el.attrsList[i].name,
        value: JSON.stringify(el.attrsList[i].value)
      }
    }
  } else if (!el.pre) {
    // non root node in pre blocks with no attributes
    el.plain = true
  }
}

export function processElement (element: ASTElement, options: CompilerOptions) {
  processKey(element)

  // determine whether this is a plain element after
  // removing structural attributes
  element.plain = !element.key && !element.attrsList.length

  processRef(element)
  processSlot(element)
  processComponent(element)
  for (let i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element
  }
  processAttrs(element)
}

function processKey (el) {
  const exp = getBindingAttr(el, 'key')
  if (exp) {
    if (process.env.NODE_ENV !== 'production' && el.tag === 'template') {
      warn(`<template> cannot be keyed. Place the key on real elements instead.`)
    }
    el.key = exp
  }
}

function processRef (el) {
  const ref = getBindingAttr(el, 'ref')
  if (ref) {
    el.ref = ref
    el.refInFor = checkInFor(el)
  }
}

export function processFor (el: ASTElement) {
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const res = parseFor(exp)
    if (res) {
      extend(el, res)
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `Invalid v-for expression: ${exp}`
      )
    }
  }
}

type ForParseResult = {
  for: string;
  alias: string;
  iterator1?: string;
  iterator2?: string;
};

export function parseFor (exp: string): ?ForParseResult {
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return
  const res = {}
  res.for = inMatch[2].trim()
  const alias = inMatch[1].trim().replace(stripParensRE, '')
  const iteratorMatch = alias.match(forIteratorRE)
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, '')
    res.iterator1 = iteratorMatch[1].trim()
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim()
    }
  } else {
    res.alias = alias
  }
  return res
}

function processIf (el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}

function processIfConditions (el, parent) {
  // 找到当前元素的父级元素描述对象的前一个子元素。
  const prev = findPrevElement(parent.children)
  if (prev && prev.if) {
    // 找到了前一个子元素，并且有if属性。
    // 调用addIfConditions方法。
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    })
  } else if (process.env.NODE_ENV !== 'production') {
    // 非生产环境下提出警告。
    warn(
      `v-${el.elseif ? ('else-if="' + el.elseif + '"') : 'else'} ` +
      `used on element <${el.tag}> without corresponding v-if.`
      // v-else-if或者v-else在元素上使用，但是没有对应的v-if。
    )
  }
}

function findPrevElement (children: Array<any>): ASTElement | void {
  // 找到children数组里的最后一个ASTElement元素描述对象。
  let i = children.length
  while (i--) {
    if (children[i].type === 1) {
      // type全等于1，说明是ASTElement元素描述对象。
      // 返回这个元素描述对象。
      return children[i]
    } else {
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        // 非生产环境下，且元素描述对象的text不是空。提出警告。
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) ` +
          `will be ignored.`
          // 在v-if和v-else(-if)间的文本，将会被忽略。
        )
      }
      // 将children顶部的元素pop出去。
      children.pop()
    }
  }
}

export function addIfCondition (el: ASTElement, condition: ASTIfCondition) {
  // 增加ifCondition方法。用于处理v-if指令。
  if (!el.ifConditions) {
    // 判断元素描述对象的ifConditions是否存在，如果不存在就初始化为一个空数组。
    el.ifConditions = []
  }
  // 最后将condition对象push进元素描述对象的ifConditions数组。
  // ASTIfCondition类型是一个对象，包含两个属性，exp，block。
  // exp指的是v-else-if指令的属性值，或者v-else指令的属性值（undefined)。
  // block指的是v-else-if或者v-else指令对应的元素描述对象。
  el.ifConditions.push(condition)
}

function processOnce (el) {
  const once = getAndRemoveAttr(el, 'v-once')
  if (once != null) {
    el.once = true
  }
}

function processSlot (el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name')
    if (process.env.NODE_ENV !== 'production' && el.key) {
      warn(
        `\`key\` does not work on <slot> because slots are abstract outlets ` +
        `and can possibly expand into multiple elements. ` +
        `Use the key on a wrapping element instead.`
      )
    }
  } else {
    let slotScope
    if (el.tag === 'template') {
      slotScope = getAndRemoveAttr(el, 'scope')
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && slotScope) {
        warn(
          `the "scope" attribute for scoped slots have been deprecated and ` +
          `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
          `can also be used on plain elements in addition to <template> to ` +
          `denote scoped slots.`,
          true
        )
      }
      el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')
    } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
        warn(
          `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
          `(v-for takes higher priority). Use a wrapper <template> for the ` +
          `scoped slot to make it clearer.`,
          true
        )
      }
      el.slotScope = slotScope
    }
    const slotTarget = getBindingAttr(el, 'slot')
    if (slotTarget) {
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget
      // preserve slot as an attribute for native shadow DOM compat
      // only for non-scoped slots.
      if (el.tag !== 'template' && !el.slotScope) {
        addAttr(el, 'slot', slotTarget)
      }
    }
  }
}

function processComponent (el) {
  let binding
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true
  }
}

function processAttrs (el) {
  const list = el.attrsList
  let i, l, name, rawName, value, modifiers, isProp
  for (i = 0, l = list.length; i < l; i++) {
    name = rawName = list[i].name
    value = list[i].value
    if (dirRE.test(name)) {
      // mark element as dynamic
      el.hasBindings = true
      // modifiers
      modifiers = parseModifiers(name)
      if (modifiers) {
        name = name.replace(modifierRE, '')
      }
      if (bindRE.test(name)) { // v-bind
        name = name.replace(bindRE, '')
        value = parseFilters(value)
        isProp = false
        if (modifiers) {
          if (modifiers.prop) {
            isProp = true
            name = camelize(name)
            if (name === 'innerHtml') name = 'innerHTML'
          }
          if (modifiers.camel) {
            name = camelize(name)
          }
          if (modifiers.sync) {
            addHandler(
              el,
              `update:${camelize(name)}`,
              genAssignmentCode(value, `$event`)
            )
          }
        }
        if (isProp || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          addProp(el, name, value)
        } else {
          addAttr(el, name, value)
        }
      } else if (onRE.test(name)) { // v-on
        name = name.replace(onRE, '')
        addHandler(el, name, value, modifiers, false, warn)
      } else { // normal directives
        name = name.replace(dirRE, '')
        // parse arg
        const argMatch = name.match(argRE)
        const arg = argMatch && argMatch[1]
        if (arg) {
          name = name.slice(0, -(arg.length + 1))
        }
        addDirective(el, name, rawName, value, arg, modifiers)
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          checkForAliasModel(el, value)
        }
      }
    } else {
      // literal attribute
      if (process.env.NODE_ENV !== 'production') {
        const res = parseText(value, delimiters)
        if (res) {
          warn(
            `${name}="${value}": ` +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.'
          )
        }
      }
      addAttr(el, name, JSON.stringify(value))
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component &&
          name === 'muted' &&
          platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true')
      }
    }
  }
}

function checkInFor (el: ASTElement): boolean {
  let parent = el
  while (parent) {
    if (parent.for !== undefined) {
      return true
    }
    parent = parent.parent
  }
  return false
}

function parseModifiers (name: string): Object | void {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}

function makeAttrsMap (attrs: Array<Object>): Object {
  // 定义一个map空对象。
  const map = {}
  for (let i = 0, l = attrs.length; i < l; i++) {
    if (
      process.env.NODE_ENV !== 'production' &&
      map[attrs[i].name] && !isIE && !isEdge
    ) {
      // 提出警告，有重复的属性。
      warn('duplicate attribute: ' + attrs[i].name)
    }
    // map保存了属性里的所有属性名和属性值。
    map[attrs[i].name] = attrs[i].value
  }
  // 返回map对象。
  return map
}

// for script (e.g. type="x/template") or style, do not decode content
function isTextTag (el): boolean {
  return el.tag === 'script' || el.tag === 'style'
}

function isForbiddenTag (el): boolean {
  return (
    // style标签是被完全禁止的。
    el.tag === 'style' ||
    (el.tag === 'script' && (
      // script标签，没有指定type，或者指定type为text/javascript的也是被禁止的。
      !el.attrsMap.type ||
      el.attrsMap.type === 'text/javascript'
    ))
  )
}

const ieNSBug = /^xmlns:NS\d+/
const ieNSPrefix = /^NS\d+:/

/* istanbul ignore next */
function guardIESVGBug (attrs) {
  const res = []
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (!ieNSBug.test(attr.name)) {
      attr.name = attr.name.replace(ieNSPrefix, '')
      res.push(attr)
    }
  }
  return res
}

function checkForAliasModel (el, value) {
  let _el = el
  while (_el) {
    if (_el.for && _el.alias === value) {
      warn(
        `<${el.tag} v-model="${value}">: ` +
        `You are binding v-model directly to a v-for iteration alias. ` +
        `This will not be able to modify the v-for source array because ` +
        `writing to the alias is like modifying a function local variable. ` +
        `Consider using an array of objects and use v-model on an object property instead.`
      )
    }
    _el = _el.parent
  }
}