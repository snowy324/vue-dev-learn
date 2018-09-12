/* @flow */

// 冻结一个空对象，不能删除、添加、改变属性，不能改变已有属性的可枚举性，可配置性，可写性
export const emptyObject = Object.freeze({})

// these helpers produces better vm code in JS engines due to their
// explicitness and function inlining
// %check是flow里的谓词函数 isUndef判断参数是不是underfined或者null,如果是就返回true
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

// 判断参数不是underfined也不是null
export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}

// 判断参数为true
export function isTrue (v: any): boolean %checks {
  return v === true
}

// 判断参数为false
export function isFalse (v: any): boolean %checks {
  return v === false
}

/**
 * Check if value is primitive 原始
 * 判断参数是值类型（字符串，数字，布尔值，还有一个是symbol，符号），但不是underfined或者null
 */
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily 主要 used to tell
 * Objects from primitive 原始 values when we know the value
 * is a JSON-compliant 兼容 type.
 * mixed是flow中的混合类型，当使用混合类型的时候，必须先判断typeof该类型的值
 * 快速判断参数是不是object类型，且不是null
 */
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value e.g. [object Object]
 * 提取Object原型上的toString方法
 */
const _toString = Object.prototype.toString

// 字符串的slice方法，左闭右开，截取空格后面的值
// 获取参数的toString之后的原始类型
export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 * 严格根据toString方法判断参数是javascript里面真正的对象（而不是function等等）
 */
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}

// 判断参数是不是正则
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 * String构造函数，传入对象为Object的时候，输出[object Object]，相当于调用了Object.prototype.toString()方法
 * String构造函数，传入对象为Function的时候，将整个函数转换为字符串
 * String构造函数，传入对象为Array的时候，将数组转换为字符串
 * parseFloat将里面的String(val)转换成浮点数
 * Math.floor取地板，Math.ceil取天花板，Math.round取四舍五入
 * isFinite判断是不是数字，如果是NAN或者正无穷负无穷，就返回false
 * 判断参数是有效的数组索引
 */
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * Convert a value to a string that is actually rendered.
 * 将参数转换为一个实际呈现的字符串
 * 判断参数是否为空，如果为空则返回''
 * 如果不为空，用嵌套三元继续判断，如果是对象，则使用JSON.stringify去转换
 * JSON.stringify方法有三个参数，第一个参数是传入对象，第二个参数是replacer，第三个参数是space(表示缩进空格，可以取从0到10)
 * 第二个参数replacer可以是数组，也可以是函数，相当于一个白名单过滤，如果是数组，那存在于数组中的key值才会被JSON.stringify处理
 * 如果replacer是函数，会遍历传入的所有对象（如果是对象，则只有一个，如果是数组，则遍历数组里的所有对象），有两个参数，key和value，必须要有return值
 * JSON.stringify不能处理值为Function或者值为undefined
 * 如果为空，则直接用String构造函数去转换
 */
export function toString (val: any): string {
  return val == null
    ? ''
    : typeof val === 'object'
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert a input value to a number for persistence.
 * 将字符串参数转换为number类型，如果成功则返回转换后的number，不成功（isNaN）则返回原始字符串
 * If the conversion fails, return original string.
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * flow maybe types 判断类型，如value : ?string，意味着value可以是string，或者是underfined，或者是null
 * flow 可选参数 如这里的expectsLowerCase ?: boolean 表示这个参数可以不传，或者undefined，或者匹配的类型，但是不接受null
 */
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  const map = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 */
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if a attribute is a reserved attribute.
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * Remove an item from an array
 */
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether the object has the property.
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 */
export function cached<F: Function> (fn: F): F {
  const cache = Object.create(null)
  return (function cachedFn (str: string) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }: any)
}

/**
 * Camelize a hyphen-delimited string.
 */
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

/**
 * Capitalize a string.
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * Simple bind polyfill for environments that do not support it... e.g.
 * PhantomJS 1.x. Technically we don't need this anymore since native bind is
 * now more performant in most browsers, but removing it would be breaking for
 * code that was able to run in PhantomJS 1.x, so this must be kept for
 * backwards compatibility.
 */

/* istanbul ignore next */
function polyfillBind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length
  return boundFn
}

function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}

export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind

/**
 * Convert an Array-like object to a real Array.
 */
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 */
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}

/**
 * Perform no operation. 不执行任何操作
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/)
 */
export function noop (a?: any, b?: any, c?: any) {}

/**
 * Always return false.返回false
 */
export const no = (a?: any, b?: any, c?: any) => false

/**
 * Return same value 返回这个值
 */
export const identity = (_: any) => _

/**
 * Generate a static keys string from compiler modules.
 */
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every((e, i) => {
          return looseEqual(e, b[i])
        })
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
export function once (fn: Function): Function {
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}
