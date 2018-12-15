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
  // i表示当前字符的索引位置。expression是表达式。
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
        // 第一个过滤器。expression是undefined。
        // lastFilterIndex赋值为管道符的下一个位置。
        lastFilterIndex = i + 1
        // 截取管道符之前的表达式，赋值给expression。
        expression = exp.slice(0, i).trim()
      } else {
        // 当遇到第二个或者更多的过滤器时，执行这里的代码。
        // 截取上一个管道符的下一个位置，到当前索引位置中间的字符，去掉首位空格，就是过滤器的名称。
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
        // 判断是否在正则环境下。
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          // 如果是在正则环境下，将inRegex赋值为true。
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    // 如果expression不存在，说明for循环解析结束，并没有遇到想要的管道符。
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    // 如果expression存在，且lastFiterIndex不是0，则将最后一个过滤器push进filters数组中。
    pushFilter()
  }

  function pushFilter () {
    // 如果filters不存在，则初始化它为一个空数组。
    // 将过滤器截取，并存储到这个filters中。
    // 最后将lastFilterIndex赋值。
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  if (filters) {
    // 如果filters存在。
    for (i = 0; i < filters.length; i++) {
      // 对表达式进行过滤器操作。
      expression = wrapFilter(expression, filters[i])
    }
  }

  // 最终将表达式最终的结果返回。
  return expression
}

function wrapFilter (exp: string, filter: string): string {
  // 判断filter里是否有(符号。
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    // 如果没有，直接使用resolveFilter。
    return `_f("${filter}")(${exp})`
  } else {
    // 如果有(，则获取过滤器的名字，赋值给name，获取参数，赋值给args。
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    // 将参数也传递进入_f中。
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}

