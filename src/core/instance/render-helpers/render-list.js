/* @flow */

import { isObject, isDef } from 'core/util/index'

/**
 * Runtime helper for rendering v-for lists.
 * 运行时助手，渲染v-for列表。
 */
export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key
  if (Array.isArray(val) || typeof val === 'string') {
    // 如果val是数组或者字符串。
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      // 对数组或者字符串中的每一项执行render函数。
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    // 如果val是数字。先new Array(val)新建一个数组。
    // new Array(number)可以创建一个length为number的空数组，里面的值都是undefined。
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      // 再对数组的每一项执行render函数。
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    // 如果val是一个object。
    // 获取object里的keys。
    keys = Object.keys(val)
    // 创建一个数组。
    ret = new Array(keys.length)
    for (i = 0, l = keys.length; i < l; i++) {
      // 获取keys中的每一个key值，执行render函数。
      key = keys[i]
      ret[i] = render(val[key], key, i)
    }
  }
  // isDef定义在shared/util.js中。判断某个值既不是null也不是undefiend。
  if (isDef(ret)) {
    (ret: any)._isVList = true
  }
  return ret
}
