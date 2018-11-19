/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// Object.create(__proto__)，传入的第一个参数作为创造对象的__proto__。
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept截距 mutating变异 methods and emit events
 * 将原生的方法变异，触发观察者的通知以及其他事件。
 * 最后暴露arrayMethods对象，里面有7个属性，每个属性对应一个与原生方法同名的变异方法。
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    // 将原始方法执行的结果缓存。
    const result = original.apply(this, args)
    // 在Observer类示例化的时候，将传入的value的__ob__属性指向该Observer示例。
    // 所以猜测这里的this是一个被Observer(value)里的value。
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        // push是向数组末尾增加元素，unshift是向数组开头增加元素。
        inserted = args
        break
      case 'splice':
        // slice方法获取第二个到最后的参数。
        // 而splice方法，索引为2的参数开始正好就是插入数组的新元素。第一个参数是开始位置，第二个参数是删除元素的个数。
        inserted = args.slice(2)
        break
    }
    // 如果有新增元素，触发observeArray事件。
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知观察者。
    ob.dep.notify()
    return result
  })
})
