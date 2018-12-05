/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 * 函数返回document.querySelect(el)，返回该元素。如果没有该元素，则发出警告，并创建一个div。
 */
export function query (el: string | Element): Element {
  if (typeof el === 'string') {
    // 如果el的类型是string。获取el对应的element。
    const selected = document.querySelector(el)
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 如果没有获取到element。发出警告。并创建一个新的div。
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}
