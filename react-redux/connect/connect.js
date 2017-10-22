import connectAdvanced from '../components/connectAdvanced'
import shallowEqual from '../utils/shallowEqual'
import defaultMapDispatchToPropsFactories from './mapDispatchToProps'
import defaultMapStateToPropsFactories from './mapStateToProps'
import defaultMergePropsFactories from './mergeProps'
import defaultSelectorFactory from './selectorFactory'

/*
  connect is a facade over connectAdvanced. It turns its args into a compatible
  selectorFactory, which has the signature:

    (dispatch, options) => (nextState, nextOwnProps) => nextFinalProps

 */
/*
  connect 是对 connectAdvanced 的一层封装，它将参数

    (dispatch, options) => (nextState, nextOwnProps) => nextFinalProps

  connect 将它的参数作为选项传给 connectAdvanced，并且 Connect 组件每次被实例化或者 hot reloaded 时都会将他们传递给 selectorFactory

  selectorFactory 通过 mapStateToProps，mapStateToPropsFactories，mapDispatchToProps
  mapDispatchToPropsFactories，mergeProps，mergePropsFactories 以及 pure 这些参数返回一个真正的 props 选择器

  Connect 组件实例在接受到新的 props 或者 store state 时会调用这个最终生成的 props 选择器

 */
function match(arg, factories, name) {
  for (let i = factories.length - 1; i >= 0; i--) {
    const result = factories[i](arg)
    if (result) return result
  }

  return (dispatch, options) => {
    throw new Error(`Invalid value of type ${typeof arg} for ${name} argument when connecting component ${options.wrappedComponentName}.`)
  }
}

function strictEqual(a, b) { return a === b }

// createConnect 有一些默认配置来构建官方的 connect 行为
// 使用不同的选项调用它可以打开一些测试和可扩展性场景
export function createConnect({
  connectHOC = connectAdvanced,
  mapStateToPropsFactories = defaultMapStateToPropsFactories,
  mapDispatchToPropsFactories = defaultMapDispatchToPropsFactories,
  mergePropsFactories = defaultMergePropsFactories,
  selectorFactory = defaultSelectorFactory
} = {}) {
  return function connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    {
      pure = true,
      areStatesEqual = strictEqual,
      areOwnPropsEqual = shallowEqual,
      areStatePropsEqual = shallowEqual,
      areMergedPropsEqual = shallowEqual,
      ...extraOptions
    } = {}
  ) {
    const initMapStateToProps = match(mapStateToProps, mapStateToPropsFactories, 'mapStateToProps')
    const initMapDispatchToProps = match(mapDispatchToProps, mapDispatchToPropsFactories, 'mapDispatchToProps')
    const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')

    return connectHOC(selectorFactory, {
      // 错误信息中使用
      methodName: 'connect',

      // 根据容器组件的 displayName 生成 Connect 的 displayName
      getDisplayName: name => `Connect(${name})`,


      // 如果传入的 mapStateToProps 是一个 falsy 的值（比如为空），那么 Connect 不再监听 store 的变化
      shouldHandleStateChanges: Boolean(mapStateToProps),

      // 透传给 selectorFactory
      initMapStateToProps,
      initMapDispatchToProps,
      initMergeProps,
      pure,
      areStatesEqual,
      areOwnPropsEqual,
      areStatePropsEqual,
      areMergedPropsEqual,

      // 一些额外的可以覆盖 connect 或者 connectAdvanced 默认配置的参数，
      ...extraOptions
    })
  }
}

export default createConnect()
