/* @flow */

import { emptyObject } from 'shared/util'
import { parseFilters } from './parser/filter-parser'

// 提供的基础警告方法。
export function baseWarn (msg: string) {
  // 输出error。
  console.error(`[Vue compiler]: ${msg}`)
}

export function pluckModuleFunction<F: Function> (
  modules: ?Array<Object>,
  key: string
): Array<F> {
  // 传入一个modules，过滤modules中的undefined并返回。
  // Array.prototypr.filter可以用来过滤掉数组里的undefined或者null。
  return modules
    ? modules.map(m => m[key]).filter(_ => _)
    : []
}

export function addProp (el: ASTElement, name: string, value: string) {
  (el.props || (el.props = [])).push({ name, value })
  el.plain = false
}

export function addAttr (el: ASTElement, name: string, value: any) {
  (el.attrs || (el.attrs = [])).push({ name, value })
  el.plain = false
}

// add a raw attr (use this in preTransforms)
export function addRawAttr (el: ASTElement, name: string, value: any) {
  el.attrsMap[name] = value
  el.attrsList.push({ name, value })
}

export function addDirective (
  el: ASTElement,
  name: string,
  rawName: string,
  value: string,
  arg: ?string,
  modifiers: ?ASTModifiers
) {
  (el.directives || (el.directives = [])).push({ name, rawName, value, arg, modifiers })
  el.plain = false
}

export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?ASTModifiers,
  important?: boolean,
  warn?: Function
) {
  // 获取修饰符。没有就为一个空对象。
  modifiers = modifiers || emptyObject
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (
    process.env.NODE_ENV !== 'production' && warn &&
    modifiers.prevent && modifiers.passive
  ) {
    // 非生产环境下，如果passive和prevent同时使用了，提出警告。
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.'
    )
    // passive和prevent不能同时使用，passive处理不能阻止默认事件。
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture
    name = '!' + name // mark the event as captured
  }
  if (modifiers.once) {
    delete modifiers.once
    name = '~' + name // mark the event as once
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    delete modifiers.passive
    name = '&' + name // mark the event as passive
  }

  // normalize click.right and click.middle since they don't actually fire
  // this is technically browser-specific, but at least for now browsers are
  // the only target envs that have right/middle clicks.
  if (name === 'click') {
    if (modifiers.right) {
      name = 'contextmenu'
      delete modifiers.right
    } else if (modifiers.middle) {
      name = 'mouseup'
    }
  }

  let events
  if (modifiers.native) {
    delete modifiers.native
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    events = el.events || (el.events = {})
  }

  const newHandler: any = {
    value: value.trim()
  }
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers
  }

  const handlers = events[name]
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    events[name] = newHandler
  }

  el.plain = false
}

export function getBindingAttr (
  el: ASTElement,
  name: string,
  getStatic?: boolean
): ?string {
  // 获取使用:name或者，v-bind:name的指令的属性值。
  const dynamicValue =
    getAndRemoveAttr(el, ':' + name) ||
    getAndRemoveAttr(el, 'v-bind:' + name)
  if (dynamicValue != null) {
    // dynamicValue指的是属性值，但在这里!=null判断却是判断属性是否存在。
    // 因为如果属性存在但没有写属性值，或者等于''，都会被处理成''，而''!=null是成立的。
    // 只有属性不存在时，dynamicValue才是undefined。undefined!=null是false。
    // 调用parseFilters函数进行处理，也就是说，绑定属性，其实是可以使用过滤器的。
    // parseFilters定义在parser/filter-parser.js中。用于解析过滤器，并返回处理后的值。
    return parseFilters(dynamicValue)
  } else if (getStatic !== false) {
    // getStatic是函数的第三个参数，如果不传，则是undefined。
    // undefined !== false 为true。所以只有显示传递getStatic为false时，这里才不执行。
    // 获取静态属性name的属性值。
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      // 将该值返回。
      // 非绑定属性，使用JSON。stringify处理，保证返回的一定是一个string，而不是变量或者表达式。
      return JSON.stringify(staticValue)
    }
  }
}

// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.
// 提醒：这个仅仅在属性列表attrsList移除属性所以它不会在处理属性processAttrs处理。
// 默认它不会将其在attrsMap中移除因为map会在编码中用到。
export function getAndRemoveAttr (
  el: ASTElement,
  name: string,
  removeFromMap?: boolean
): ?string {
  let val
  if ((val = el.attrsMap[name]) != null) {
    // 先获取元素描述对象中该属性的值，如果这个值存在。
    // 缓存el.attrsList。
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      // 找到el.attrsList数组中name属性的项。并将其删除。
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  if (removeFromMap) {
    // 如果传入了removeFromMap，则将el.attrsMap中的name属性给删除。
    delete el.attrsMap[name]
  }
  // 返回name属性对应的属性值，如果没有就返回undefined。
  return val
}
