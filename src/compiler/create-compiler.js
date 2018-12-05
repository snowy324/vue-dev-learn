/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

// 创建一个编译创建器。
export function createCompilerCreator (baseCompile: Function): Function {
  // 这里返回了一个createCompiler函数。这个函数返回了一个对象，对象里有两个属性。
  // 一个是compile，对应compile函数。一个是compileToFunctions，对应createCompileToFunctionFn(compile)的结果。
  return function createCompiler (baseOptions: CompilerOptions) {
    // compile函数传入两个参数，一个是template模板字符串，一个是options。
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      // 创建一个finalOptions，将传入的baseOptions作为它的__proto__。
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []
      // finalOptions.warn赋值为一个函数。
      // 如果传入tip，则将msg消息push进入tips，否则将msg消息push进入errors。
      finalOptions.warn = (msg, tip) => {
        (tip ? tips : errors).push(msg)
      }

      if (options) {
        // 如果传入了options。
        // merge custom modules
        // 合并自定义的模板。
        if (options.modules) {
          // 如果options.modules存在。
          // 则将finalOptions.modules赋值为baseOptions.modules或者空数组执行concat传入options.modules之后的数组。
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        // 合并自定义指令。
        if (options.directives) {
          // 如果options.directives存在。
          // extend方法定义在shared/util.js中。将第二个对象的每一个属性和值都复制给第一个对象。
          // 将finalOption.directives赋值为一个包含了baseOptions的directives和options的directives的对象。
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            // 对于options里的其他项，只要不是modules和directives，全部复制进finalOptions里。
            finalOptions[key] = options[key]
          }
        }
      }

      // 定义compiled，缓存baseCompile的执行结果。
      // 执行结果返回值是一个对象，包含三个属性：ast，render，staticRenderFns。
      const compiled = baseCompile(template, finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        // 非生产环境下。执行detectErrors传入compiled.ast。全部push进errors里。
        errors.push.apply(errors, detectErrors(compiled.ast))
      }
      // 将errors和tips绑定到compiled上。
      compiled.errors = errors
      compiled.tips = tips
      // 返回compiled。
      return compiled
    }

    return {
      compile,
      // createCompileToFunctionFn的执行结果，也是返回一个函数。
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
