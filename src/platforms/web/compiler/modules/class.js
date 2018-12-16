/* @flow */

import { parseText } from 'compiler/parser/text-parser'
import {
  getAndRemoveAttr,
  getBindingAttr,
  baseWarn
} from 'compiler/helpers'

function transformNode (el: ASTElement, options: CompilerOptions) {
  // 获取warn函数。
  const warn = options.warn || baseWarn
  // 获取非绑定属性class的属性值。
  const staticClass = getAndRemoveAttr(el, 'class')
  if (process.env.NODE_ENV !== 'production' && staticClass) {
    // 非生产环境下，非绑定属性class使用插值语法，提出警告。
    const res = parseText(staticClass, options.delimiters)
    if (res) {
      warn(
        `class="${staticClass}": ` +
        'Interpolation inside attributes has been removed. ' +
        'Use v-bind or the colon shorthand instead. For example, ' +
        'instead of <div class="{{ val }}">, use <div :class="val">.'
      )
    }
  }
  if (staticClass) {
    // 如果存在非绑定属性的class值，使用JSON.stringify处理后直接赋值给el.staticClass。
    el.staticClass = JSON.stringify(staticClass)
  }
  // 获取使用v-bind或者:的class属性值。
  const classBinding = getBindingAttr(el, 'class', false /* getStatic */)
  if (classBinding) {
    // 如果存在，将该字符串赋值给el.classBinding。
    el.classBinding = classBinding
  }
}

function genData (el: ASTElement): string {
  let data = ''
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`
  }
  return data
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData
}
