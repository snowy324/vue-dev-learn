/* @flow */

import config from 'core/config'

import {
  warn,
  isObject,
  toObject,
  isReservedAttribute
} from 'core/util/index'

/**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 * 运行时助手，为了把v-bind="object"合并到VNode的data中。
 * 这是_b方法。
 */
export function bindObjectProps (
  data: any,
  tag: string,
  value: any,
  asProp: boolean,
  isSync?: boolean
): VNodeData {
  if (value) {
    if (!isObject(value)) {
      // 如果value不是Object，则提出警告。
      process.env.NODE_ENV !== 'production' && warn(
        'v-bind without argument expects an Object or Array value',
        this
      )
    } else {
      if (Array.isArray(value)) {
        // toObject方法定义在shared/util.js中。利用extend方法将数组中的每一项复制给一个对象并返回该对象。
        value = toObject(value)
      }
      let hash
      for (const key in value) {
        // 对于每个value中的属性。
        if (
          key === 'class' ||
          key === 'style' ||
          // isReservedAttribute定义在shared/util.js中，保存着key,slot,ref,slot-scope,is五个标签。
          isReservedAttribute(key)
        ) {
          // 如果key是class或者style或者是isReservedAttribute中的5个标签。
          hash = data
        } else {
          // 缓存data的attrs属性并获取attrs.type。
          const type = data.attrs && data.attrs.type
          // 通过判断asProp或者config.mustUseProp的结果，将data的domProps或者attrs属性赋值给hash。
          hash = asProp || config.mustUseProp(tag, type, key)
            ? data.domProps || (data.domProps = {})
            : data.attrs || (data.attrs = {})
        }
        if (!(key in hash)) {
          // 对于hash中不存在的key属性。
          // 将value的key值赋值给hash的key属性。
          hash[key] = value[key]

          if (isSync) {
            // 缓存data.on的值，如果不存在则赋值为一个空对象。
            const on = data.on || (data.on = {})
            // on上的updata:key属性为一个函数。函数的作用是将value的key属性赋值。
            on[`update:${key}`] = function ($event) {
              value[key] = $event
            }
          }
        }
      }
    }
  }
  return data
}
