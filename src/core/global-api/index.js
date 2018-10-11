/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual个人 fields instead.'
      )
    }
  }
  // 改变Vue的config属性的特性。将其设置为不可写。
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // 暴露Vue的工具方法，这几个方法不作为公共API。
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // set和delete方法都在observer中定义。
  Vue.set = set
  Vue.delete = del
  // nextTick方法在util中定义。
  Vue.nextTick = nextTick

  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    // 将components,directives,filters添加到Vue函数的options属性里。
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios场景.
  // 将Vue的基础构造器存储到options里的_base，为了在weex里的多实例场景里扩展纯对象组件。暂时搞不明白。
  Vue.options._base = Vue

  // 将内置组件复制到Vue.options.components里，内置的组件有keep-alive。
  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
