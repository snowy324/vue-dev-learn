/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})
// 缓存Vue.prototype.$mount方法。
const mount = Vue.prototype.$mount
// 重新定义$mount方法。
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    // 当el绑定在body或者html上时，提出警告。
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 缓存options。
  const options = this.$options
  // resolve template/el and convert to render function
  // 解决template/el并且将其转换成render函数。
  if (!options.render) {
    // 如果options里没有定义render。
    // 获取options里的template。
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        // 如果template的类型是string。
        if (template.charAt(0) === '#') {
          // 如果template的首位是#。执行idToTemplat函数。
          // idToTemplate根据传入的template返回对应element元素。
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            // 非生产环境下，template未找到。提出警告。
            warn(
              // 模板元素未找到或者是空的。
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果template的类型不是string，则获取它的nodeType。
        // 获取template的innerHTML。
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          // 非生产环境下。发出警告。非法template选项。
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果template没有定义，则对el执行getOuterHTML方法。
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      // 当performance时，标记测试性能开始。
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // compileToFunctions函数。从./compile/index.js中解构出来的。注：注意是platforms/web/compiler下的。而不是core/compiler下的。
      // compileToFunctions执行之后，返回一个对象，包含三个属性。ast，render，staticRenderFns。
      const { render, staticRenderFns } = compileToFunctions(template, {
        // shouldDecodeNewlines针对IE所有属性值中的换行和tab都会出现编码的问题。
        shouldDecodeNewlines,
        // shouldDecodeNewLinesForHref针对chrome中href值的换行和tab出现的编码问题。
        shouldDecodeNewlinesForHref,
        // delimiters用于改变Vue插值的符号。这是一个数组，有两项，第一项是插值开始符号，第二项是插值结束符号。
        delimiters: options.delimiters,
        // 默认是false。可以设置为true，则会保留并渲染模板中的HTML注释。
        comments: options.comments
      }, this)
      // 将函数执行结果的render和staticRenderFns都挂载在options上。
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      // 当performance时，标记测试性能结束。
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 重新调用之前缓存的Vue.prototype.$mount方法。
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    // element.outerHTML可以用来获取描述元素（包括其后代）的序列化HTML片段。
    return el.outerHTML
  } else {
    // 如果没有获取到，则创建一个div。
    const container = document.createElement('div')
    // 深度clone一个节点。
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

// 将compileToFunctions绑定在Vue.compile上。
Vue.compile = compileToFunctions

export default Vue
