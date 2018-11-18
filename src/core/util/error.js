/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'

// 处理错误函数(主要是为了执行errorCaptured钩子)。
export function handleError (err: Error, vm: any, info: string) {
  if (vm) {
    let cur = vm
    // 循环遍历当前组件vm的父级，检索option里的errorCaptured钩子。
    while ((cur = cur.$parent)) {
      // 第一次循环的是cur（vm）的父级。也就意味着errorCaptured钩子是写在父级里，针对子组件的函数。
      const hooks = cur.$options.errorCaptured
      if (hooks) {
        for (let i = 0; i < hooks.length; i++) {
          try {
            // errorCaptured钩子函数可以返回false，如果return了false，则不会继续往上执行。
            const capture = hooks[i].call(cur, err, vm, info) === false
            if (capture) return
          } catch (e) {
            globalHandleError(e, cur, 'errorCaptured hook')
          }
        }
      }
    }
  }
  globalHandleError(err, vm, info)
}

function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      logError(e, null, 'config.errorHandler')
    }
  }
  logError(err, vm, info)
}

function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err)
  } else {
    throw err
  }
}
