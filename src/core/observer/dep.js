/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * dep是一个可被多个指令订阅的观察者。
 */
export default class Dep {
  // 定义Dep类的静态属性，只属于Dep类，而不属于它的任何实例。
  // ES6中只有静态方法，没有静态属性，只能在类外部，用打点方式赋值，如Dep.target = null。
  static target: ?Watcher;
  id: number;
  // subs就是订阅者。用数组的方式呈现。
  subs: Array<Watcher>;

  // 构造器
  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 增加订阅者。
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 删除订阅者。
  removeSub (sub: Watcher) {
    // remove方法定义在share/util.js中，作用是将第二个参数（元素）在第一个参数（数组）中删除。
    // 原理是先利用indexOf方法查出索引，然后利用splice方法删除。
    remove(this.subs, sub)
  }

  depend () {
    // 如果Dep.target属性存在，target是一个Watcher。
    if (Dep.target) {
      // 调用Wathcer的addDep方法。
      // class中的this一般指向类的实例。但使用起来需小心，如果单独把方法提取出来，this就会指向当前运行的环境。
      // 这里的depend方法应该作为Dep类的实例对象的方法去使用，所以这里的this指向Dep类的实例对象。
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize稳定 the subscriber list first
    // javascript里slice方法无参数可以将对象转换为数组。
    // 不明白这里为什么需要这么处理，猜测Dep类实例的subs（订阅者）可能会发生类型变化？需要调用notify方法时，稳定处理为数组？
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // config.async = false，在core/config.js中定义。
      // 如果不是异步运行，subs订阅者在时间表中是没有排序的。
      // 必须要将其按照id排序，保证他们按照正确的顺序运行。
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // 数组的sort函数，有一个可选参数（函数），如果不传入参数，默认按照字符串Unicode码点进行排序。
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      // 循环执行订阅者的update方法。
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated评估.
// this is globally unique because there could be only one
// 全局在某一时刻同时只有一个watcher被评估？
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

// 暴露增加Dep静态属性target的方法。
export function pushTarget (_target: ?Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

// 暴露删除Dep静态属性target的方法。
export function popTarget () {
  Dep.target = targetStack.pop()
}
