/* @flow */

const validDivisionCharRE = /[\w).+\-_$\]]/

export function parseFilters (exp: string): string {
  // inSingle标识的作用是标识当前环境在单引号''内。
  let inSingle = false
  // inDouble标识的作用是标识当前环境在双引号""内。
  let inDouble = false
  // inTemplateString标识的作用是标识当前环境是在模板字符串``里。
  let inTemplateString = false
  // inRegex标识的作用是标识当前环境在正则//里。
  let inRegex = false
  // 当遇到{时curly加一，当遇到}时curly减一。通过此判断环境是否在{}内部。
  let curly = 0
  // 当遇到[时，square加一，当遇到]时，square减一。通过此判断环境是否在[]内部。
  let square = 0
  // 当遇到(时，paren加一，当遇到)时，paren减一。通过此判断环境是否在()内部。
  let paren = 0

  // lastFilterIndex标识字符的索引位置。
  let lastFilterIndex = 0
  // c表示当前字符对应的ASCII码，prev表示前一个字符对应的ASCII码。
  // i表示当前字符的索引位置。expression表示函数返回值。
  // filters是一个数组，保存过滤器的函数。
  let c, prev, i, expression, filters

  for (i = 0; i < exp.length; i++) {
    // 每次循环开始前，都将上一个字符的ASCII码赋值给prev。
    prev = c
    // 将索引位置i的ASCII码赋值给c。
    c = exp.charCodeAt(i)
    if (inSingle) {
      // 0x27是'单引号的ASCII码，0x5c是\的ASCII码。\有转义的作用。
      // 如果遇到了结束单引号，则将inSingle标识赋值为false。
      if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
      // 同理，0x22对应"，如果遇到结束双引号，则将inDouble标识赋值为false。
      if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
      // 0x60对应`，如果遇到模板结束符号，则将inTemplateString标识赋值为false。
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {
      // 0x2f对应/，如果遇到正则结束符号，则将inRegex标识赋值为false。
      if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
      // 0x7C对应|管道符。
      // 如果当前位置是管道符，而且前一个、后一个字符都不是管道符。
      // 而且当前环境不是在{}，()，[]内。
      c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      // 满足上面条件才执行这里的语句。
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        // 双引号，inDouble标识赋值为true。跳出循环。
        case 0x22: inDouble = true; break         // "
        // 单引号，inSingle标识赋值为true。跳出循环。
        case 0x27: inSingle = true; break         // '
        // `，inTemplateString标识赋值为true。跳出循环。
        case 0x60: inTemplateString = true; break // `
        // (，paren++，跳出循环。
        case 0x28: paren++; break                 // (
        // )，paren--，跳出循环。
        case 0x29: paren--; break                 // )
        // [，square++，跳出循环。
        case 0x5B: square++; break                // [
        // ]，square--，跳出循环。
        case 0x5D: square--; break                // ]
        // {，curly++，跳出循环。
        case 0x7B: curly++; break                 // {
        // }，curly--，跳出循环。
        case 0x7D: curly--; break                 // }
      }
      if (c === 0x2f) { // /
        // 当c为/时。
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

function wrapFilter (exp: string, filter: string): string {
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
