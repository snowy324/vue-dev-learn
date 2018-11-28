/* @flow */

import { warn, extend, isPlainObject } from 'core/util/index'

// 这个方法是_g方法。
export function bindObjectListeners (data: any, value: any): VNodeData {
  if (value) {
    if (!isPlainObject(value)) {
      // 如果传入的value不是纯粹的对象，则提出警告。
      process.env.NODE_ENV !== 'production' && warn(
        'v-on without argument expects an Object value',
        this
      )
    } else {
      // 缓存data上的on属性。如果on属性存在，则把on属性全部复制到一个空对象中，如果不存在则使用一个空对象。
      const on = data.on = data.on ? extend({}, data.on) : {}
      for (const key in value) {
        // 对value中的每一个属性执行操作。
        // 缓存on也就是data.on中的相同属性的值。
        const existing = on[key]
        // 缓存value中的key属性值。
        const ours = value[key]
        // 对data.on属性的值重新复制，如果原始值存在，则把原始值和value中对应的属性值合并，如果不存在则直接等于value中的对应值。
        on[key] = existing ? [].concat(existing, ours) : ours
      }
    }
  }
  return data
}
