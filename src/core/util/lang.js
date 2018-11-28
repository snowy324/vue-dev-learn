/* @flow */

/**
 * Check if a string starts with $ or _
 * 检查一个字符串是否以$或者_开头。
 */
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 * 封装Object.defineProperty方法。传入三个参数：对象，键值，值，是否可以被枚举。
 * 将val作为obj[key]的初始值。
 */
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 */
// 正则。表示除了/n之外的任何字符。/n表示一个换行符。
const bailRE = /[^\w.$]/
// 返回了一个函数。利用闭包，这个函数用来获取传入参数obj的相关属性。
export function parsePath (path: string): any {
  // 如果path以数字字母下划线开头，则直接return。
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  // 使用递归方法，解析路径。
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
