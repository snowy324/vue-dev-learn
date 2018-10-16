/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively递归 traverse an object to evoke唤起 all converted转换的
 * getters, so that every nested嵌套的 property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse (val: any) {
  // 调用_traverse方法。调用时seenObjects是一个空的Set对象。
  _traverse(val, seenObjects)
  // Set.prototype.clear方法。用于清空Set对象中的所有元素。
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  // isA判断val是不是数组。
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    // val不是数组，且不是对象。或者val被冻结。或者val是VNode的实例。直接return。
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    // Set.prototype.has方法用于判断Set对象中是否有传入的value值。返回一个boolean值。
    if (seen.has(depId)) {
      // 如果seen已经有depId，直接return。
      return
    }
    // 如果没有，则add一个。
    // Set.prototype.add方法用来向一个Set对象的末尾添加一个指定的值。
    seen.add(depId)
  }
  if (isA) {
    // 当val是数组的时候。
    i = val.length
    // 递归调用__traverse。
    // i等于val.length。循环的第一项是val[length-1]，最后一项是val[0]。
    while (i--) _traverse(val[i], seen)
  } else {
    // Object.keys返回的是一个自身的可枚举属性数组。
    keys = Object.keys(val)
    i = keys.length
    // 递归调用__traverse。
    while (i--) _traverse(val[keys[i]], seen)
  }
}
