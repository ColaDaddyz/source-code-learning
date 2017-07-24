import compose from './compose'

/**
 * 创建一个 store 增强器，给 dispatch 函数提供一个中间件。
 * 它方便我们处理各种任务，比如异步 actions，或者提供每次用户行为的日志
 *
 * 可以看看 `redux-thunk`，它是 Redux 中间件的一个例子
 *
 * store enhancer 可以是一个 compose 链，但是因为中间件可能是异步的，所以它必须是这个 compose 链的第一个
 *
 * 注意：每个中间件需要提供 `dispatch` 和 `getState` 两个命名函数
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
export default function applyMiddleware(...middlewares) {
    return (createStore) => (reducer, preloadedState, enhancer) => {
        const store = createStore(reducer, preloadedState, enhancer)
        let dispatch = store.dispatch
        let chain = []

        const middlewareAPI = {
            getState: store.getState,
            dispatch: (action) => dispatch(action) //保证 dispatch更新后，内部的dispatch能跟着变化
        }
        chain = middlewares.map(middleware => middleware(middlewareAPI))

        // dispatch = middle1ware1(middle1ware2(store.dispatch)) 此时将多个中间件串联起来了
        dispatch = compose(...chain)(store.dispatch)

        return {
            ...store,
            dispatch
        }
    }
}
