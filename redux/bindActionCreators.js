/**
 * 返回一个用 dispatch 包裹的新函数
 */
function bindActionCreator(actionCreator, dispatch) {
  return (...args) => dispatch(actionCreator(...args))
}

/**
 * 将 action creators 转换为同名对象，但使用 dispatch 将他们包装起来，这样就可以直接调用他们了
 * 主要是方便，不用自己手动 `store.dispatch(MyActionCreators.doSomething())`
 *
 * 方便起见，你可以传入一个函数作为第一个参数，它会返回一个函数
 *
 * @param {Function|Object} actionCreators，一个 actionCreator 函数
 * 或者包含多个 actionCreator 的对象
 *
 * @param {Function} dispatch  `dispatch` 函数，store 提供
 *
 * @returns {Function|Object}
 * 仿照原对象返回，只不过每个 action creator会被一个 `dispatch` 包含
 * 如果传入一个函数，返回值也是一个函数
 */
export default function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  //类型错误
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
      `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  // 处理多个action creators
  var keys = Object.keys(actionCreators)
  var boundActionCreators = {}
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  return boundActionCreators
}
