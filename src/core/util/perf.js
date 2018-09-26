import { inBrowser } from './env'

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  // 非真视后，当环境是浏览器，而且window对象拥有performance对象时。
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    // mark是performance中的一个函数
    perf.mark &&
    // measure是performance中的一个函数
    perf.measure &&
    // clearMarks是performance中的一个函数
    perf.clearMarks &&
    // clearMeasures是performance中的一个函数
    perf.clearMeasures
  ) {
    // 当perf存在且拥有以上四个方法时。
    // mark方法用于创造一个名字位tag的时间戳。
    mark = tag => perf.mark(tag)
    // measure方法用于创造一个和起止tag有关具名的时间戳，可以利用它的属性来测试性能，如duration。
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // 【疑问】为何立马就进行measure清除？
      perf.clearMeasures(name)
    }
  }
}
