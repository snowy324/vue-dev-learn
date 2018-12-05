/* @flow */

import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'

type CompiledFunctionResult = {
  render: Function;
  staticRenderFns: Array<Function>;
};

function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}

// 传入一个compile函数。
export function createCompileToFunctionFn (compile: Function): Function {
  // 定义cache为一个空对象。
  const cache = Object.create(null)

  // 返回一个函数。
  // 传入三个参数，template模板字符串，option，vm实例。
  return function compileToFunctions (
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    // 将options缓存。
    options = extend({}, options)
    // 缓存options里的warn项。如果没有就等于baseWarn。
    const warn = options.warn || baseWarn
    // 删除options里的warn项。
    delete options.warn

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // detect possible CSP restriction
      // 探测可能的Content-Security-Policy内容安全政策限制。
      try {
        // 尝试使用new Function(String)的方式创建一个函数。
        new Function('return 1')
      } catch (e) {
        // String.prototype.match方法。
        // 传入一个正则表达式，如果传入的不是正则对象，则会隐式调用new RegExp()创建一个正则对象。
        // 如果没有匹配到，返回null。
        // 如果没有加g全局匹配，匹配到了，则数组只有一项，是一个对象，包括index，groups(捕获组)，input(原字符串)。
        // 如果加了g全局匹配。匹配到了，则返回数组，是匹配到的所有字符串的集合。
        if (e.toString().match(/unsafe-eval|CSP/)) {
          // 如果e错误里匹配到了unsafe-eval或者CSP字样。则提出警告。
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
            // 似乎你正在一个使用内容安全政策禁止不安全的eval的环境里单独构建Vue.js。
            // 模板编译器不能在这个环境里运行。
            // 考虑降低安全策略去允许unsafe-eval或者将你的模板预编译成渲染函数。
          )
        }
      }
    }

    // check cache
    // 如果options里定义了delimiters。就将key定义为delimiters和template合并成一个字符串。
    // 如果没有定义，key直接等于template。
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    // 检查闭包cache里的key值是否存在，如果存在，直接返回。
    // 这里缓存避免了重复编译，提高了编译的性能。
    if (cache[key]) {
      return cache[key]
    }

    // compile
    // 这里的compile就是传入的参数函数。
    // compiled就是函数处理的后的结果。
    const compiled = compile(template, options)

    // check compilation errors/tips
    // 检查编译错误/提示。
    if (process.env.NODE_ENV !== 'production') {
      // 非生产环境下。使用warn打印compiled里的errors信息。
      if (compiled.errors && compiled.errors.length) {
        warn(
          `Error compiling template:\n\n${template}\n\n` +
          compiled.errors.map(e => `- ${e}`).join('\n') + '\n',
          vm
        )
      }
      // 使用tips打印compiled里的tips信息。
      if (compiled.tips && compiled.tips.length) {
        compiled.tips.forEach(msg => tip(msg, vm))
      }
    }

    // turn code into functions
    // 定义res。
    const res = {}
    // 定义fnGenErrors数组。
    const fnGenErrors = []
    // createFunction创建并返回一个以compiled.render为函数体的函数，fnGenErrors是存储产生错误的数组。
    res.render = createFunction(compiled.render, fnGenErrors)
    // compiled.staticRenderFns是一个字符串数组。
    // res.staticRenderFns的作用是渲染优化。
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    // 检查函数创建错误。
    // 这个仅仅当编译器发生bug时才执行。
    // 大部分是提供给代码生成发展使用。
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
          fnGenErrors.map(({ err, code }) => `${err.toString()} in\n\n${code}\n`).join('\n'),
          vm
        )
      }
    }

    // 将res缓存在cache中。
    return (cache[key] = res)
  }
}
