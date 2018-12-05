/* @flow */

import { inBrowser } from 'core/util/index'

// compat兼容性。
// check whether current browser encodes a char inside attribute values
let div
function getShouldDecode (href: boolean): boolean {
  div = div || document.createElement('div')
  // /n是换行符。
  // 在chrome里，href里的值，如果有换行，则会被编码为&#10。
  // 在chrome里，href里的值，如果有tab，则会被编码为&#9。
  // 在IE里，所有属性值都会存在这个问题。
  // 这都属于浏览器的怪癖。
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  // String.prototype.indexOf方法，找到对应的值，则返回第一次出现该值的索引，如果没找到则返回-1。
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: IE encodes newlines inside attribute values while other browsers don't
// IE在属性值里编码新行，但是其他浏览器不会。
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// #6828: chrome encodes content in a[href]
// chrome在href里编码内容。
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
