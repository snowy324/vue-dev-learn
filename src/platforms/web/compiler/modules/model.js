/* @flow */

/**
 * Expand input[v-model] with dyanmic type bindings into v-if-else chains
 * 将input[v-model]扩展为动态类型绑定的v-if-else链。
 * Turn this:
 *   <input v-model="data[type]" :type="type">
 * into this:
 *   <input v-if="type === 'checkbox'" type="checkbox" v-model="data[type]">
 *   <input v-else-if="type === 'radio'" type="radio" v-model="data[type]">
 *   <input v-else :type="type" v-model="data[type]">
 */

import {
  addRawAttr,
  getBindingAttr,
  getAndRemoveAttr
} from 'compiler/helpers'

import {
  processFor,
  processElement,
  addIfCondition,
  createASTElement
} from 'compiler/parser/index'

function preTransformNode (el: ASTElement, options: CompilerOptions) {
  if (el.tag === 'input') {
    // 只有当元素的类型是input时才执行这里的代码。
    // 缓存el.attrsMap的引用为map。
    const map = el.attrsMap
    if (!map['v-model']) {
      // 如果元素没有使用v-model指令，直接return。
      return
    }

    // 定义类型绑定值。
    let typeBinding
    if (map[':type'] || map['v-bind:type']) {
      // 如果使用了v-bind或者：，则使用getBindingAttr获取type绑定字符串。
      typeBinding = getBindingAttr(el, 'type')
    }
    if (!map.type && !typeBinding && map['v-bind']) {
      // 没有使用非绑定的type属性，也没有使用v-bind和:绑定type，但是使用了v-bind。
      // 例如: <input v-model="value" v-bind="{ type : inputValue }"。
      // 此时，typeBinding赋值为v-bind绑定对象的type。
      typeBinding = `(${map['v-bind']}).type`
    }

    if (typeBinding) {
      // 如果typeBinding存在，说明是使用了v-model并且绑定了type的input元素。
      // 获取元素v-if的属性值。
      const ifCondition = getAndRemoveAttr(el, 'v-if', true)
      // 定义ifConditionExtra常量，如果idCondition存在，则赋值为$$(v-if的属性值)，否则是空字符串。
      const ifConditionExtra = ifCondition ? `&&(${ifCondition})` : ``
      // 根据是否有v-else给hasElse赋值。有则赋值为true，否则赋值为false。
      const hasElse = getAndRemoveAttr(el, 'v-else', true) != null
      // 获取v-else-if属性值。
      const elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true)
      // 1. checkbox
      // 创建第一个分支。克隆一个元素。
      const branch0 = cloneASTElement(el)
      // process for on the main node
      processFor(branch0)
      addRawAttr(branch0, 'type', 'checkbox')
      processElement(branch0, options)
      // 防止被重复处理。将processed属性赋值为true。
      branch0.processed = true // prevent it from double-processed
      // 将元素的if属性赋值为，只有typeBinding全等于checkbox的时候才显示。
      branch0.if = `(${typeBinding})==='checkbox'` + ifConditionExtra
      addIfCondition(branch0, {
        exp: branch0.if,
        block: branch0
      })
      // 2. add radio else-if condition
      const branch1 = cloneASTElement(el)
      getAndRemoveAttr(branch1, 'v-for', true)
      addRawAttr(branch1, 'type', 'radio')
      processElement(branch1, options)
      addIfCondition(branch0, {
        exp: `(${typeBinding})==='radio'` + ifConditionExtra,
        block: branch1
      })
      // 3. other
      const branch2 = cloneASTElement(el)
      getAndRemoveAttr(branch2, 'v-for', true)
      addRawAttr(branch2, ':type', typeBinding)
      processElement(branch2, options)
      addIfCondition(branch0, {
        exp: ifCondition,
        block: branch2
      })

      if (hasElse) {
        branch0.else = true
      } else if (elseIfCondition) {
        branch0.elseif = elseIfCondition
      }

      // 将branch0返回。
      return branch0
    }
  }
}

function cloneASTElement (el) {
  // 创建并返回一个新的AST元素。
  // 由于el.attrsList是一个数组，引用类型，这里使用了slice()，相当于做了一级的深拷贝。
  // slice方法是返回一个新数组。
  return createASTElement(el.tag, el.attrsList.slice(), el.parent)
}

export default {
  preTransformNode
}
