/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    // 分别对Vue的'component','directive','filter'添加函数。
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        // 如果没有传入definition。直接取回this.options中的对应项。
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          // 如果是component则需要验证组件名称是否合法。
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // 当类型是component，且传入的definition是一个纯粹的对象时，会调用Vue.extend方法。
          definition.name = definition.name || id
          // options._base定义在global-api/index.js中，指向Vue原始的构造器函数。但是暂时不明白为什么要这么使用。
          // Vue.extend方法在global-api/extend.js中。
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 最终将definition存储在Vue实例中。
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
