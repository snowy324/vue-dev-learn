/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

// createCompiler定义在compiler/index中。创建一个传入参数的编译器。
// 执行结果返回一个对象，compile对应compile函数，compileToFunctions对应createCompileToFunctionFn(compile)的结果。
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
