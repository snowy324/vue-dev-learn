/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'

// Regular Expressions for parsing tags and attributes
// 解析标签和属性表达式。
// String.prototype.match方法，非全局匹配时，数组第一项是匹配的字符串，后面几个是捕获组，有几个捕获组就有几项。之后是groups( 暂时不明白是什么),index,input。
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
// could use https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
// but for Vue templates we can enforce a simple charset
// ncname是不带前缀的XML标签名称。
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i
// #7298: escape - to avoid being pased as HTML comment when inlined in page
const comment = /^<!\--/
const conditionalComment = /^<!\[/

// 这个变量是为了解决老版本的火狐中的兼容性问题。
// 在老版本火狐中，g是''而不是undefined。
let IS_REGEX_CAPTURING_BROKEN = false
'x'.replace(/x(.)?/g, function (m, g) {
  IS_REGEX_CAPTURING_BROKEN = g === ''
})

// Special Elements (can contain anything)
// 特殊元素（可以包含任意内容），判断是否是纯文本标签。
export const isPlainTextElement = makeMap('script,style,textarea', true)
// 定义reCache对象。
const reCache = {}

// 解码字符实体。
const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t'
}
// 这两个常量是针对shouldDecodeNewlines和shouldDecodeNewlinesForHref的。
const encodedAttr = /&(?:lt|gt|quot|amp);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#10|#9);/g

// #5992
// pre标签和textarea标签会忽略第一个换行符，这两个常量是为了解决这个问题。
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

// 解析HTML字符实体。
function decodeAttr (value, shouldDecodeNewlines) {
  // 通过判断shouldDecodeNewlines来使用哪种正则。
  // shouldDecodeNewlines是一个boolean。
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  // 将字符实体替换。
  return value.replace(re, match => decodingMap[match])
}

export function parseHTML (html, options) {
  // stack是一个栈，所有非一元标签，都会push进入这个stack栈。用于判断标签是否完整闭合。
  // 栈是先入后出，把所有开始标签都push到栈中，遇到结束标签时，再把栈顶的元素出栈。
  // 如果结束标签和栈顶元素不一致，则说明栈顶标签没有闭合。
  const stack = []
  // 缓存options里的expectHTML。
  const expectHTML = options.expectHTML
  // 缓存options里的isUnaryTag。如果没有则返回no，一个永远返回false的函数。
  // isUnaryTag是判断是否是一元标签。
  const isUnaryTag = options.isUnaryTag || no
  // 缓存options里的canBeLeftOpenTag选项。如果没有则等于一个永远返回false的函数。
  // canBeLeftOpenTag是判断是否可以省略闭合标签的非一元标签。
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no
  // 初始化index,last,lastTag标量。
  // index是html的读取位置。last是还未被解析的html字符串。lastTag是存储stack的栈顶元素。
  let index = 0
  let last, lastTag
  // 当html没有被解析完成时，解析会一直进行。
  while (html) {
    // 每次循环开始之前，将html赋值给last。
    last = html
    // Make sure we're not in a plaintext content element like script/style
    // 确保我们不是在一个纯文本内容的元素里。
    if (!lastTag || !isPlainTextElement(lastTag)) {
      // 判断lastTag不存在，或者lastTag不是script,style,textarea中的任意一个。
      // 匹配html中第一次出现<符号的位置。存储在textEnd中。
      // 接下来对textEnd做了多重判断。
      let textEnd = html.indexOf('<')
      if (textEnd === 0) {
        // 如果html第一个字符就是<符号。
        // Comment:
        // comment是判断注释开头的正则。
        if (comment.test(html)) {
          // 判断注释的结尾。
          const commentEnd = html.indexOf('-->')

          if (commentEnd >= 0) {
            // 如果找到了注释结尾。
            if (options.shouldKeepComment) {
              // 如果options.shouldKeepComment为true。
              // comment传入的一个方法。向闭包currentParent的children数组中push一个对象，表示注释。
              // String.prototype.substring方法，截取两个索引之间的字符串。左闭右开，同时不会改变原字符串。
              options.comment(html.substring(4, commentEnd))
            }
            // advence是一个方法，将html截取，从传入参数的位置截取到最后。
            // 这里就是从commentEnd的位置加3（-->)的位置截取。生成新的html。
            advance(commentEnd + 3)
            // 如果走到了这里，继续执行循环。下面的代码不会执行。
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        // 条件注释，以<![开头，]>结束的注释。
        if (conditionalComment.test(html)) {
          // 找到条件注释的结尾位置。
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            // 如果找到了特殊注释的结尾，截取特殊注释之后的html。
            advance(conditionalEnd + 2)
            continue
          }
        }

        // Doctype:
        // doctype匹配<!DOCTYPE XXXXXX>开头。
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          // 如果匹配到了doctype开头。截取doctypeMatch[0].length之后的字符串。
          // doctypeMatch[0]也就是match结果的第一项，即匹配到的字符串，在这里就是<!DCOTYPE xxx>。
          advance(doctypeMatch[0].length)
          continue
        }

        // End tag:
        // 匹配结束标签。
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          // 缓存当前的index。
          const curIndex = index
          // 根据endTagMatch匹配字符串的长度截取html。
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // Start tag:
        // 缓存parseStartTag的执行结果。
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          // 如果有返回值，则说明匹配开始标签成功。
          // 调用handleStartTag处理startTagMatch，即match对象。
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(lastTag, html)) {
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      if (textEnd >= 0) {
        rest = html.slice(textEnd)
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
        advance(textEnd)
      }

      if (textEnd < 0) {
        text = html
        html = ''
      }

      if (options.chars && text) {
        options.chars(text)
      }
    } else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
      // 如果html和last全等。则说明经过上面一系列处理之后，html并没有发生变化。
      // 剩下的全部是纯文本，不需要被解析。
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`)
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  function advance (n) {
    index += n
    html = html.substring(n)
  }

  // 解析开始标签。
  function parseStartTag () {
    // 尝试匹配开始标签，并缓存给start。
    const start = html.match(startTagOpen)
    // 如果匹配成功了，start是一个数组，包含两项。
    // 第一项是匹配到的字符串，第二项是捕获组。
    if (start) {
      // 定义一个match对象。用来存储start的相关信息。
      const match = {
        // start第二项，即捕获组，就是tag标签。
        tagName: start[1],
        // attrs数组用于存储改标签里的属性。
        attrs: [],
        // 开始位置，就是index。
        start: index
      }
      // 根据start第一项匹配的字符串长度去截取html。
      advance(start[0].length)
      // 定义end，attr。
      let end, attr

      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        // 当没有匹配到结束标签，并且匹配到是attribute时，循环就会执行。
        // 作用是解析标签中的所有属性。
        // 根据attr匹配到的属性长度截取html。
        advance(attr[0].length)
        // 将匹配到的属性存储到attrs数组当中。
        match.attrs.push(attr)
      }
      if (end) {
        // 如果匹配到了结束>或者/>，则说明这是一个完整的开始标签。
        // end是startTagClose的匹配结果，匹配end[1]是捕获组，捕获/。
        // 如果存在，则说明这是一个一元标签。如果没有匹配到，则是undefined。
        match.unarySlash = end[1]
        // 根据end匹配的长度截取html。
        advance(end[0].length)
        // match的end赋值为index。即开始标签的结束为止。
        match.end = index
        // 返回match对象。
        return match
      }
    }
  }

  // 处理开始标签函数。
  function handleStartTag (match) {
    // 缓存match的tagName，即标签名称。
    const tagName = match.tagName
    // 缓存match的unarySlash。即是否是一元标签。
    // unarySlash可能是'/'，也可能是undefined。
    const unarySlash = match.unarySlash

    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag)
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    // 判断tagName是否是一元标签。
    // 使用options里的isUnaryTag函数处理，或者unarySlash强制转化为boolean。
    // isUnaryTag能判断html里规定的一些一元标签，但是可能存在自定义组件也是一元标签，所以要使用unarySlash来判断。
    const unary = isUnaryTag(tagName) || !!unarySlash

    // 判断match里attrs数组的长度。
    const l = match.attrs.length
    // 新建一个该长度的数组。
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
      // 解决Firefox的bug。
      if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
        // 如果老版本火狐的bug存在，而且args[0]即匹配字符串中没有""。
        // 如果args的3,4,5位置出现了''空字符串，就将其删除，变成undefined。
        // attribute正则里匹配的情况会有多种，因为属性的写法有多种。用不同捕获组去匹配。
        // 例如，双引号写法，单引号写法，无引号写法，单独属性写法。
        // 双引号的value值在args[3]。
        // 单引号的value值在args[4]。
        // 无引号的value值在args[5]。
        // 单独属性，没有属性值。如果有bug，也会是''，但是这里无需处理，因为之后统一成了''。
        if (args[3] === '') { delete args[3] }
        if (args[4] === '') { delete args[4] }
        if (args[5] === '') { delete args[5] }
      }
      // 获取value值。可能在3,4,5。如果都没有，就给一个''空字符串。
      // 上面单独属性没有属性值时并没有处理，因为后面value都统一给了一个''。
      const value = args[3] || args[4] || args[5] || ''
      // 字符实体时，需要兼容到IE中的属性以及chrome中href的属性值，换行和tab的特殊情况。
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        // args[1]就是属性名。
        name: args[1],
        // value就是属性值，经过decodeAttr处理字符实体之后的值。
        value: decodeAttr(value, shouldDecodeNewlines)
      }
    }

    if (!unary) {
      // 如果不是一元标签，则向stack中push一个对象，包含标签的相关信息。
      // 包括tagName，小写后的tagName，属性数组。
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs })
      // lastTag变成stack中的栈定tagName。
      lastTag = tagName
    }

    if (options.start) {
      // options.start是parse钩子函数。
      // 用于解析开始标签的钩子函数。传入tagName标签名称，attrs属性数组，unary一元标签标识，match的开始和结束位置。
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
    }

    // Find the closest opened tag of the same type
    if (tagName) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
