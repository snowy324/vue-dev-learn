/* @flow */

import config from '../config'
import { noop } from 'shared/util'

export let warn = noop
export let tip = noop
export let generateComponentTrace = (noop: any) // work around flow check
export let formatComponentName = (noop: any)

// 非生产环境。
if (process.env.NODE_ENV !== 'production') {
  // 判断是否有console对象。一般来说，低版本IE(8及以下)window对象没有console。
  const hasConsole = typeof console !== 'undefined'
  // 正则里?:表示非捕获组。
  const classifyRE = /(?:^|[-_])(\w)/g
  // 此函数将字符串开头、'-'连接、'_'连接的第一个字符变成大写。
  const classify = str => str
    .replace(classifyRE, c => c.toUpperCase())
    .replace(/[-_]/g, '')

  warn = (msg, vm) => {
    const trace = vm ? generateComponentTrace(vm) : ''

    if (config.warnHandler) {
      // 如果配置里有warnHandler，则使用配置中的warnHandler。
      config.warnHandler.call(null, msg, vm, trace)
    } else if (hasConsole && (!config.silent)) {
      // 输出警告。
      console.error(`[Vue warn]: ${msg}${trace}`)
    }
  }

  tip = (msg, vm) => {
    if (hasConsole && (!config.silent)) {
      console.warn(`[Vue tip]: ${msg}` + (
        vm ? generateComponentTrace(vm) : ''
      ))
    }
  }

  formatComponentName = (vm, includeFile) => {
    if (vm.$root === vm) {
      return '<Root>'
    }
    const options = typeof vm === 'function' && vm.cid != null
      ? vm.options
      : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm || {}
    let name = options.name || options._componentTag
    const file = options.__file
    if (!name && file) {
      const match = file.match(/([^/\\]+)\.vue$/)
      name = match && match[1]
    }

    return (
      (name ? `<${classify(name)}>` : `<Anonymous>`) +
      (file && includeFile !== false ? ` at ${file}` : '')
    )
  }

  const repeat = (str, n) => {
    let res = ''
    while (n) {
      if (n % 2 === 1) res += str
      if (n > 1) str += str
      n >>= 1
    }
    return res
  }

  generateComponentTrace = vm => {
    // 如果传入的对象是vue实例(_isVue)并且拥有首个非抽象的父组件($parent)=>暂时这么理解
    // _isVue在src/core/instance/init.js文件中。猜测用来标记是不是Vue实例。
    // $parent在src/core/instance/lifecycle.js文件中。猜测用来标记该组件的首个非抽象父组件。
    if (vm._isVue && vm.$parent) {
      const tree = []
      // 当前递归序列。
      let currentRecursiveSequence = 0
      while (vm) {
        if (tree.length > 0) {
          const last = tree[tree.length - 1]
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++
            vm = vm.$parent
            continue
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence]
            currentRecursiveSequence = 0
          }
        }
        tree.push(vm)
        vm = vm.$parent
      }
      return '\n\nfound in\n\n' + tree
        .map((vm, i) => `${
          i === 0 ? '---> ' : repeat(' ', 5 + i * 2)
        }${
          Array.isArray(vm)
            ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
            : formatComponentName(vm)
        }`)
        .join('\n')
    } else {
      return `\n\n(found in ${formatComponentName(vm)})`
    }
  }
}
