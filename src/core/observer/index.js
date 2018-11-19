/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// Object.getOwnPropertyNames返回一个由指定对象的所有自身属性的属性名（包括不可枚举属性但不包括Symbol值作为名称的属性）组成的数组。
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 * 在有些情况下我们可能会想要在组件的更新计算中禁用观察。
 */
// 定义一个flag表示是否观察。
export let shouldObserve: boolean = true
// 切换shouldObserve。
export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * Observer类附属于每个被观察的object。一旦被观察，观察者将目标object的每个属性转换成getters/setters来收集依赖并且调度更新。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    // Observer构造函数。
    this.value = value
    // 每次实例化Observer的时候，就会实例化一个Dep依赖对象。Observer.dep = new Dep()。
    this.dep = new Dep()
    this.vmCount = 0
    // def定义在core/util/lang.js中。调用Object.defineProperty方法。将value的__ob__属性指向Observer实例对象自身。
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      // 如果传入的value是数组。
      // hasProto定义在scr/core/env.js中。通过判断一个空对象能否访问__proto__属性。
      const augment = hasProto
        ? protoAugment
        : copyAugment
      // 如果hasProto存在，则直接使用protoAugment方法，将value的__proto__等于arrayMethods。
      // 如果hasProto不存在。则使用copyAugment方法。分别将arrayKeys里的方法变成arrayMethods里对应的变异后的方法。
      // arrayMethods定义在core/observer/array.js中。是Array变异之后的方法，包括  'push','pop','shift','unshift','splice','sort','reverse'。
      // 变异之后的方法可以通知Observer。
      augment(value, arrayMethods, arrayKeys)
      // 实例化Observer，传入的参数是数组的时候，执行observeArray方法。
      this.observeArray(value)
    } else {
      // 实例化Observer，传入的参数不是数组的时候，执行walk方法。
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 通过对每个属性执行walk函数，并把他们转换成getters/setters。
   * 这个方法仅当传入的value类型是Object的时候才执行。
   */
  // 对Object里的每一个属性都调用defineReactive方法。
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   * 观察一个数组。
   */
  // 对Array里的每一项执行observe方法。
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
// 直接将target的__proto__设置成src。
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
// 通过调用def方法，将target的所有key属性的属性描述符都定义成可配置，可枚举，可赋值。
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 尝试去为某个value创建一个observer实例，如果成功了则返回该实例，如果已经存在则直接返回存在的observer。
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // isObject定义在shared/util.js中。判断一个值是Object且不是null。
  if (!isObject(value) || value instanceof VNode) {
    // 如果value不是对象，或者为空，或者是VNode的实例。直接return。
    return
  }
  let ob: Observer | void
  // hasOwn定义在share/util.js中。封装了Object.hasOwnProperty方法。
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 如果Array里的某项拥有__ob__并且是Observer的实例。则直接读取这个__ob__。
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 这里相当于递归实例化Observer对象。
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    // 如果asRootData有值。vmCount加1。
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 实例化一个依赖对象。
  const dep = new Dep()

  // 获取传入对象的某个属性（key）的属性描述符。
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    // 如果property存在并且属性描述符中的configurable为不可配置，则直接返回。
    return
  }

  // cater for pre-defined getter/setters
  // 获取该属性描述符的get。
  const getter = property && property.get
  // 获取该属性描述符的set。
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    // 如果getter不存在或者setter存在，并且只传入了两个参数。（val并没有传入）。
    // 这里的目的是在val不传入的情况下初始化val，但是不明白为什么要判断getter不存在或者setter存在。
    val = obj[key]
  }

  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    // 可枚举。
    enumerable: true,
    // 可配置。
    configurable: true,
    get: function reactiveGetter () {
      // 如果这个对象的这个属性的属性描述符已经有getter，则直接执行这个getter，并当obj当成this传进去。否则等于val。（val是传入的参数）
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        // 这里加上自身判断，因为NaN === NaN 返回的是false。
        // 这样当newVal和value都是NaN的时候，就符合后面的那种情况。
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
