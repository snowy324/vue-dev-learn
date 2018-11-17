/* @flow */

// VNode是虚拟Dom。
// 真实Dom有两个属性，nodeType和nodeValue。
// nodeType有13种。其中比较重要的有：
// 1，Element，代表元素。
// 2，Attr，代表属性。
// 3，Text，代表元素或者属性的文本内容。
// 8，Comment，代表注释。
// 9，Document，代表整个文档。（Dom树的根节点）
export default class VNode {
  // tag表示标签名称。
  tag: string | void;
  // data表示一些数据。比如，attr代表属性。
  // data: { "attr": { "id" : "app" } }
  // 这个data表示id属性等于app。
  data: VNodeData | void;
  // children表示子标签。
  children: ?Array<VNode>;
  // text表示当前节点的文本。
  text: string | void;
  // elm表示当前虚拟Dom对应的真实Dom节点。
  elm: Node | void;
  // ns表示当前节点命名空间。
  ns: string | void;
  // context表示当前节点上下文。
  context: Component | void; // rendered in this component's scope
  // key表示子节点key属性。
  key: string | number | void;
  // componentOptions表示组件配置项。
  componentOptions: VNodeComponentOptions | void;
  // componentInstance表示组件实例。
  componentInstance: Component | void; // component instance
  // parent表示当前节点的父节点。
  parent: VNode | void; // component placeholder node

  // strictly internal
  // raw表示是否为原生HTML或只是普通文本。
  raw: boolean; // contains raw HTML? (server only)
  // isStatic表示静态节点标志(keep-alive)。
  isStatic: boolean; // hoisted static node
  // isRootInsert表示是否作为根节点插入。
  isRootInsert: boolean; // necessary for enter transition check
  // isComment表示是否为注释节点。
  isComment: boolean; // empty comment placeholder?
  // isCloned表示是否是克隆节点。
  isCloned: boolean; // is a cloned node?
  // isOnce表示是否为v-once节点。
  isOnce: boolean; // is a v-once node?
  // asyncFactory表示异步工厂方法。
  asyncFactory: Function | void; // async component factory function
  // asyncMeta表示异步Meta。
  asyncMeta: Object | void;
  // isAsyncPlaceholder表示是否是异步占位。
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;
  fnContext: Component | void; // real context vm for functional nodes
  fnOptions: ?ComponentOptions; // for SSR caching
  fnScopeId: ?string; // functional scope id support

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
}

export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
