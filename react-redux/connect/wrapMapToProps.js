import verifyPlainObject from '../utils/verifyPlainObject'

export function wrapMapToPropsConstant(getConstant) {
  return function initConstantSelector(dispatch, options) {
    const constant = getConstant(dispatch, options)

    function constantSelector() { return constant }
    constantSelector.dependsOnOwnProps = false 
    return constantSelector
  }
}

// createMapToPropsProxy 会使用 dependsOnOwnProps 来确定是否要将 props 作为参数传递给 mapToProps 函数
// makePurePropsSelector 也会使用 dependsOnOwnProps 来确认 props 变化时 mapToProps 是否要被调用
// 如果 mapToProps 只有一个参数，那么它不依赖父组件的 props
// 如果 mapToProps 的参数个数为0，那么我们就会假设它是通过 arguments 或者 ...args 来获取参数，因此无法准备告知它的参数个数
export function getDependsOnOwnProps(mapToProps) {
  return (mapToProps.dependsOnOwnProps !== null && mapToProps.dependsOnOwnProps !== undefined)
    ? Boolean(mapToProps.dependsOnOwnProps)
    : mapToProps.length !== 1
}

// 使用 whenMapStateToPropsIsFunction 和 whenMapDispatchToPropsIsFunction
// 这个函数将 mapToProps 用一个代理函数包裹，这个代理函数做了以下几件事
//
// * 检测 mapToProps 函数是否依赖 props，selectorFactory 需要利用它来决定，props 变化时是否要重新调用
//
// * 第一次调用时，如果返回另一个函数，会做一次处理，并将新的函数作为真的 mapToProps 返回以供后续调用
//
// * 第一次调用时，会验证结果是否是一个纯对象，为了提示开发者他们的 mapToProps 应该返回一个正确的结果
export function wrapMapToPropsFunc(mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      return proxy.dependsOnOwnProps
        ? proxy.mapToProps(stateOrDispatch, ownProps)
        : proxy.mapToProps(stateOrDispatch)
    }

    // 让 detectFactoryAndVerify 获得 ownProps
    proxy.dependsOnOwnProps = true

    proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) {
      proxy.mapToProps = mapToProps
      proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
      let props = proxy(stateOrDispatch, ownProps)

      if (typeof props === 'function') {
        proxy.mapToProps = props
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps)
      }

      if (process.env.NODE_ENV !== 'production') 
        verifyPlainObject(props, displayName, methodName)

      return props
    }

    return proxy
  }
}
