/* @flow */

// 冻结一个空对象，不能删除、添加、改变属性，不能改变已有属性的可枚举性，可配置性，可写性。
export const emptyObject = Object.freeze({})

// these helpers produces better vm code in JS engines due to their
// explicitness and function inlining
// %check是flow里的谓词函数 isUndef判断参数是不是underfined或者null,如果是就返回true。
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
 * 判断参数是值类型（字符串，数字，布尔值，还有一个是symbol，符号），但不是underfined或者null。
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
 * is a JSON-compliant 兼容 type
 * mixed是flow中的混合类型，当使用混合类型的时候，必须先判断typeof该类型的值。
 * 快速判断参数是不是object类型，且不是null。
 */
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value e.g. [object Object]
 * 提取Object原型上的toString方法。
 */
const _toString = Object.prototype.toString

// 字符串的slice方法，左闭右开，截取空格后面的值。
// 数组的slice方法，左闭右开，不改变原数组，返回截取出来的数组。
// 获取参数的toString之后的原始类型。
export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 * 严格根据toString方法判断参数是javascript里面真正的对象（而不是function等等）。
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
 * String构造函数，传入对象为Object的时候，输出[object Object]，相当于调用了Object.prototype.toString()方法。
 * String构造函数，传入对象为Function的时候，将整个函数转换为字符串。
 * String构造函数，传入对象为Array的时候，将数组转换为字符串。
 * parseFloat将里面的String(val)转换成浮点数。
 * Math.floor取地板，Math.ceil取天花板，Math.round取四舍五入。
 * isFinite判断是不是数字，如果是NAN或者正无穷负无穷，就返回false。
 * 判断参数是有效的数组索引。
 */
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * Convert a value to a string that is actually rendered.
 * 将参数转换为一个实际呈现的字符串。
 * 判断参数是否为空，如果为空则返回''。
 * 如果不为空，用嵌套三元继续判断，如果是对象，则使用JSON.stringify去转换。
 * JSON.stringify方法有三个参数，第一个参数是传入对象，第二个参数是replacer，第三个参数是space(表示缩进空格，可以取从0到10)。
 * 第二个参数replacer可以是数组，也可以是函数，相当于一个白名单过滤，如果是数组，那存在于数组中的key值才会被JSON.stringify处理。
 * 如果replacer是函数，会遍历传入的所有对象（如果是对象，则只有一个，如果是数组，则遍历数组里的所有对象），有两个参数，key和value，必须要有return值。
 * JSON.stringify不能处理值为Function或者值为undefined。
 * 如果为空，则直接用String构造函数去转换。
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
 * 将字符串参数转换为number类型，如果成功则返回转换后的number，不成功（isNaN）则返回原始字符串。
 * If the conversion fails, return original string.
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * flow maybe types 判断类型，如value : ?string，意味着value可以是string，或者是underfined，或者是null。
 * flow 可选参数 如这里的expectsLowerCase ?: boolean 表示这个参数可以不传，或者undefined，或者匹配的类型，但是不接受null。
 * 这里: (key: string) => true | void 表示返回值也是一个函数，这个函数有一个string类型的参数，返回一个ture或者void。
 * Object.create()方法接受两个参数，第一个是原型，第二个是属性描述符的javascript对象，可以利用Obejct.create(null)创造一个空对象，且没有toString()、hasOwnProperty
等继承于Object.prototype上的方法。
 * 字符串的split函数，不会改变原字符串，返回一个数组，根据split()里的参数进行分割，如split()不传入参数，则生成一个长度为0的数组，数组第一项为字符串，如果传入split('')，则将字符串每个字母都分开。
 * 这里利用了闭包，返回的函数中，map对象不会消失。
 * 返回的函数，用来判断传入的参数是不是存储在map里，如果是则返回true，不是则返回undefined。
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
 * 判断参数是不是内置标签，包括Slot和Component。
 */
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if a attribute is a reserved attribute.
 * 判断参数是不是保留参数，包括key,ref,slot,slot-scope,is
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * Remove an item from an array
 * 将第二个参数（item)从第一个参数（arr数组）中移除。
 * 数组和字符串都有indexOf方法，数组的indexOf能输出参数位于数组的索引，字符串的indexOf返回参数字符在字符串首次出现的位置，对大小写敏感，如果没出现返回-1，也可以接受第二个参数。
 * 表示开始搜索的位置，取值可以从0到string.length-1。
 * Array.prototype.splice方法，用于添加|删除数组，第一个参数是索引值，第二个参数是删除的个数，第三个、第四个、第五个等等参数是新加入的元素，直接改变原数组，返回被删除的项目。
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
 * Object.prototype.hasOwnProperty可以检查参数是否是对象自身属性（不包括继承属性）。
 * 这个地方有疑问，数组其实也继承了hasOwnProperty方法，为什么这个地方又重新封装了一次，利用call来执行这个方法。
 * 猜测的是，javascript没有将hasOwnProperty作为关键词，可能对象可以自己定义一个属性叫做hasOwnProperty，利用原型上的方法则可以避免这个问题。
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 * 这个地方的<F: Function>是泛型，generic type。fn是形参，它的类型是F也就Function，返回值也是F。
 * 这个函数是一个工具，来缓存函数。利用cahce加快数据的读取速度，加做缓存策略。
 * 第一次运行的时候，把结果存储到hit中。第二次的时候可以直接返回hit，而不需要再执行这个函数。
 * || 或运算符，当前面一项为真的时候，直接返回前面一项的结果，第二项不执行。
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
 * 驼峰化分隔符连接的字符串函数。
 * 正则中\w表示数字字母下划线。
 * String.prototype.replace函数，第一个参数可以是字符串，也可以是个正则，第二个参数可以是字符串，也可以是函数。
 * replace方法不会改变原字符串。返回一个新的字符串。
 * replace方法第一个参数为正则，第二个参数为函数时，该函数会被多次调用，每次匹配到都会调用。
 * replace第二个参数函数，有几个参数：match表示匹配到的子串，之后的p1, p2 ,p3 ... 对应括号匹配的字符串。offest表示子串的偏移量。string表示原字符串。
 * 即：function (match, p1, p2, p3 ..., offset, string)
 * 在这个函数中(_, c) => c ? c.toUpperCase() : '', _代表match（匹配字符串), c代表(\w), 即第一个括号里的子串。
 * 总而言之这个函数将字符串中的-都匹配到，如果后面有数字、字母、下划线，就把-去掉，尝试将其变成大写，如果没有，直接返回空''。
 */
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

/**
 * Capitalize a string.
 * 将一个字符串首字母变成大写。
 * String.prototype.charAt方法，参数值为索引值，返回字符串在该索引值出的字符。如果索引值非法（不在0到string.length）之间，则返回一个空字符串。
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 * 正则\B表示非单词边界，\b表示单词边界。
 * replace函数第二个参数可以是替换字符串，这个字符串可以插入一些特殊变量。
 * 如：$$表示特殊符号$，$&表示匹配的子串，$`表示匹配子串左边的内容，$'表示匹配子串右边的内容。
 * 当第一个参数是正则的时候，第二个替换字符串还可以使用$n，n必须是小于100的非负整数，表示第n个括号匹配的子串。
 * 这个函数就是为了匹配非单词边界的大写字母，将其替换为-和对应的小写字母。
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
 * 为了一些不支持bind方法的环境。
 * 函数的length属性，即这里的boundFn._length属性，指的是函数定义时候的形参个数。
 * apply和call方法不同的地方在于参数，call方法是将参数依次用逗号隔开，当做多个参数，而apply方法是将所有参数放入一个数组中，作为apply的第二个参数。
 * 在这里判断boundFn传入的实参个数l, 如果l=0, 直接执行fn.call(ctx), 如果l=1, 执行fn.call(ctx, a), 如果l>1, 执行fn.apply(ctx, arguments)。
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

// 直接使用bind方法绑定上下文ctx。
// bind方法是返回一个新的函数，需要进行调用。
// call和apply是直接执行函数。
function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}

// 将上面的两个方法整合成一个bind方法，如果Function的prototype中存在bind方法，则执行原生bind函数，如果没有则执行polyfillBind垫片函数。
export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind

/**
 * Convert an Array-like object to a real Array.
 * 将一个类数组对象转化为一个真正的数组。
 * while(i--), 先判断i为true Or false, 然后在执行--操作。
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
 * 将一个对象的属性复制到另一个对象当中。
 * for...in...可以遍历这个对象的所有可枚举属性。
 */
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 * 利用上面的extend方法，将一个数组中的对象合并成单个对象。
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
 * Generate a static keys string from compiler编译器 modules.
 * Array.prototype.reduce函数，接收两个参数，第一个参数reducer函数，第二个参数是initialValue累加器accmulator初始值，可以不传，默认为数组第一项。
 * reducer函数接收四个参数，accmulator累加器，currentValue当前值，currentIndex当前索引，array数组。
 * ModuleOptions是自定义的flow type。 在flow/compiler.js文件中定义， 其中staticKeys是一个Array<string>, 字符串类型的数组。
 * 这个函数将一个由ModuleOptions类型的数据组成的数组，里面每一项的staticKeys用','瓶装成一个string并返回。
 * 这里的keys就是accmulator累加器， 用一个[]来进行初始化， 然后对每一项的staticKeys进行concat操作。 最后用join连接返回一个字符串。
 * Array.prototype.concat方法， 用来合并数组， 该方法不会改变原数组， 而是返回一个新的数组。
 */
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 * Javascript中， try...catch(e)... 可以让JS不因为try中的错误中断运行。 也可以在try中throw自定义的错误处理， 在catch中进行处理。
 * Istanbul是Javascript中代码覆盖率测试工具。 注释中 * istanbul ignore next * 则是忽略计算代码覆盖率。
 * Array.prototype.every方法， 用来测试数组中每一项数据是否满足一项要求， 接收两个参数， 第一个参数是callback, 第二个参数是thisArg（用来callback执行时当做this）
 * every中callback接收三个参数， currentValue当前值，inedx当前索引，array数组。
 * every对数组中每一项执行callback函数， 如果遇到false则立即返回false, 且不再继续执行。 如果所有项都返回true, 则返回true。
 * every不会改变原数组。
 * every对空数组始终返回true。 因为空数组的所有元素（为0）满足任何给定条件。
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    // a和b都是object且不为null（isObject函数判断）。
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        // 如果a和b都是数组。
        return a.length === b.length && a.every((e, i) => {
          // 递归调用looseEqual方法。
          return looseEqual(e, b[i])
        })
      } else if (!isArrayA && !isArrayB) {
        // a和b都不是数组。
        // 获取a和b上的所有可枚举属性（不包括原型链上的）。
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
    // a和b都不是Object，那就是值类型。
    // toString方法： 除了null和undefined之外，所有数据类型都具有toString()方法。
    // 而String方法也可以作用于null和undefined。
    // 同时也可以使用 + '' 的方法将其他数据转化为字符串。
    return String(a) === String(b)
  } else {
    // a和b其中一个是Object, 另一个不是。
    return false
  }
}

// 判断某个val是否存在于arr中。 如果存在返回索引值， 不存在则返回-1。
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 * 保证某个函数只会被执行一次。
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
