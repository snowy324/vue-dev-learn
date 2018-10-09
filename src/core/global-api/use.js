/* @flow */

// toArray在share/util.js中，将类数组对象转换为真正的Array对象。
import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 或假视后，如果this.__installedPlugins不存在，则初始化_installedPlugins为一个数组。
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // Array.prototype.indexOf方法，判断某个值是否在数组中，如果存在则返回索引值，如果不存在则返回-1。
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // arguments就是类数组对象，第二个参数传入1，将arguments里的第一项删除。结合Vue.use()的使用方法可知，Vue.use的第一个参数是插件本身，如Vue.use(VueRouter)。
    const args = toArray(arguments, 1)
    // Array.prototype.unshift方法，直接改变原数组，将一个或者多个元素插入到数组的开头，并返回数组新的长度。
    // 将this(Vue实例)插入到args中。
    args.unshift(this)
    // 调用插件里的方法。args是Vue.use方法传入的第二个参数，是一个可选的选项对象。
    if (typeof plugin.install === 'function') {
      // 当plugin是一个对象，install属性是function时。
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // 当plugin直接是一个function时。
      plugin.apply(null, args)
    }
    // 将plugin放入installedPlugins也就是this._installedPlugins中。
    installedPlugins.push(plugin)
    return this
  }
}
