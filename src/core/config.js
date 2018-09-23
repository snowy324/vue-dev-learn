/* @flow */

import {
  no,
  noop,
  identity
} from 'shared/util'

import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = {
  // user 用户
  optionMergeStrategies: { [key: string]: Function }; // 配置合并策略。
  silent: boolean; // 是否静默。
  productionTip: boolean; // 是否生产提示。
  performance: boolean; // 是否性能（分析？）。
  devtools: boolean; // 是否启用开发工具。
  // 这种flow写法经测试，该变量可以为null或者undefined，也可以为函数，函数可以有三个参数（部分有也可以），也可以没有，但是类型必须符合，必须没有返回值或者直接手动返回undefined。
  errorHandler: ?(err: Error, vm: Component, info: string) => void; // 异常处理处理函数。
  warnHandler: ?(msg: string, vm: Component, trace: string) => void; // 警告处理处理函数。
  ignoredElements: Array<string | RegExp>; // 忽略元素数组。
  keyCodes: { [key: string]: number | Array<number> };

  // platform 平台
  isReservedTag: (x?: string) => boolean; // 是否是保留的标签。
  isReservedAttr: (x?: string) => boolean; // 是否是保留的属性。
  parsePlatformTagName: (x: string) => string; // 解析平台标签名称。
  isUnknownElement: (x?: string) => boolean; // 是否是未知元素。
  getTagNamespace: (x?: string) => string | void; // 获取标签命名空间。
  mustUseProp: (tag: string, type: ?string, name: string) => boolean; //

  // private 私有的
  async: boolean; // 是否异步。

  // legacy 遗产
  _lifecycleHooks: Array<string>;
};

export default ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   */
  performance: false,

  /**
   * Error handler for watcher errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   */
  async: true,

  /**
   * Exposed for legacy reasons
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
