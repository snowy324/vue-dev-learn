import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 定义Vue类。
function Vue (options) {
	// 不为生产环境，而且this不是Vue的实例，提示错误，保证Vue只能用New Vue(options)去使用。
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // _init方法是在./init.js文件中initMixIn函数中定义，赋值在Vue.prototype._init上。
  this._init(options)
}

// initMixin的作用就是将_init方法挂载到Vue.prototype上。
initMixin(Vue)
// stateMixin的作用是：
// 首先定义Vue.prototype.$data和$props的属性描述符，将这两个属性get方法都转到this._data和this._props上。即Vue实例的_data和_props上。set方法则提出警告。
// 然后往Vue.prototype上挂载$set，$delete，$watch方法。
stateMixin(Vue)
// eventsMixin的作用是向Vue.prototype上挂载$on，$once，$off，$emit方法。
eventsMixin(Vue)
// lifecycleMixin的作用是向Vue.prototype上挂载_update，$forceUpdate，$destory方法。
lifecycleMixin(Vue)
// renderMixin的作用有两个：
// 一是利用installRenderHelper函数，向Vue.prototype上挂载所有renderhelper定义的方法，包括_o，_n，_s，_l等等。
// 二是向Vue.prototype上挂载$nextTick，_render方法。
renderMixin(Vue)

export default Vue
