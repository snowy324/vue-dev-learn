/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// createCompilerCreator允许替换解析器、优化器、代码生成器等等去创建编译器，SSR优化编译器。
// 这里我们只是暴露了一个使用默认参数的默认编译器。
// 这里暴露出去的createCompiler，是createCompilerCreator的执行结果。
// 执行结果返回createCompiler同名的函数。
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 传入两个参数，template模板字符串，options编译参数。
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
