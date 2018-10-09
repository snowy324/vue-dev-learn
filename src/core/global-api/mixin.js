/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  // mixin混入。传入一个Object对象，利用mergeOptions将mixin里传入的options都混入到Vue中。
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
