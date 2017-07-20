import isPlainObject from 'lodash/isPlainObject';
import $$observable from 'symbol-observable';

/**
 * Redux 私有action
 * 对于一些未知的 actions，你必须返回当前的state
 * 如果当前的 state 是undefined，你必须返回初始值
 * 不要在你的代码里引用这种 action types
 */
export const ActionTypes = {
    INIT: '@@redux/INIT'
}

/**
 *
 * 创建一个 Redux store 保存你的 state 树，你只能使用 `dispatch()` 来改变你 store 上的数据
 * 为了根据 actions 区分 state，你可以使用 combineReducers 将多个 reducers 合并成一个
 *
 * @param {Function} reducer 一个函数，接收当前的 state 和要处理的 action，返回新的 state 树
 *
 * @param {any} [preloadedState]
 * 初始化 state。这是一个可选项，使用它你可以在程序中将服务端的数据合并到 store 上，或者
 * 恢复之前序列化过的用户会话
 *
 * @param {Function} [enhancer]
 * 可选项。利用它你可以使用第三方功能增强你的 store，比如中间件，时间旅行，持久化数据等等。
 * Redux 附带的 enhancer 是 applyMiddleware
 *
 * @returns {Store} 返回 Redux store，它允许你读取 state，dispatch actions 以及监听变化
 */
export default function createStore(reducer, preloadedState, enhancer) {
    // 根据传参个数和类型，指定 preloadedState 和 enhancer
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState
        preloadedState = undefined
    }

    // 如果 enhancer 存在且合法，走 enhancer 逻辑，return
    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            throw new Error('Expected the enhancer to be a function.')
        }

        return enhancer(createStore)(reducer, preloadedState)
    }

    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.')
    }

    // reducer 赋值给 currentReducer
    let currentReducer = reducer
    // 初始化 state 赋值给 currentState
    let currentState = preloadedState
    // 监听函数列表，触发 action 后会依次触发
    let currentListeners = []
    // 将 nextListeners 和 currentListeners 指向同一个引用
    let nextListeners = currentListeners
    let isDispatching = false

    // 保存一份 nextListeners 快照
    function ensureCanMutateNextListeners() {
        if (nextListeners === currentListeners) {
            nextListeners = currentListeners.slice()
        }
    }

    /**
     * 读取当前 store 的数据
     *
     * @returns {any} 返回放弃应用的 state
     */
    function getState() {
        return currentState
    }

    /**
     * 添加一个监听器。每次 dispatch action 导致 state 树的一部分变化时都会触发。
     * 你可以在 listener 函数内调用 getState() 方法获取当前的 state
     *
     * 你可以在监听函数内部调用dispatch，但是有几个注意事项：
     *
     * 1. 在每次 `dispatch()` 调用之前都会保存一次 subscriptions 的快照。
     *    如果你在监听器执行时进行了 subscribe 或者 unsubscribe
     *    对当前的 dispatch 不会有影响，但是对于下一次的 dispatch，无论是否嵌套了，都会取最近一次的快照
     *
     * 2. 由于嵌套 dispatch 的存在，在 listener 被调用前 store 可能就被更改了很多次，此时你的 listener 可能无法观测到所有的变化。
     *    但是在 `dispatch()` 开始前被注册的 listeners 在被调用时一定能获取最新的 state
     *
     * @param {Function} listener 每次 dispatch 时要触发的回调
     * @returns {Function} 返回一个函数，可以 unsubscribe 你的回调
     */
    function subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Expected listener to be a function.')
        }

        // 标记是否有listener
        let isSubscribed = true

        // 保存一份快照
        ensureCanMutateNextListeners()
        nextListeners.push(listener)

        return function unsubscribe() {
            if (!isSubscribed) {
                return
            }

            isSubscribed = false

            ensureCanMutateNextListeners()
            const index = nextListeners.indexOf(listener)
            nextListeners.splice(index, 1)
        }
    }

    /**
     * Dispatches action，这是唯一能触发 state 变化的方法
     *
     * 当调用 dispatch 时，会将当前的 state 和 `action` 传入 reducer 函数，
     * 它返回一个新的 state，作为下一个 state 树，并且此时所有的 listeners 都会被通知
     *
     * 这里只支持传入普通对象，如果你希望支持 Promise，Observable，thunk或者别的，
     * 你需要使用相关的 middleware 来包裹你创建 store 的函数。
     * 举个例子，你可以看看 `redux-thunk`。
     *
     * @param {Object} action
     *  一个普通对象，它代表着"发什么了什么改变"。
     *  最好保证 action 是可串联的，这样你可以记录和复盘用户操作，也可以使用 redux-devtools 进行时间旅行，
     *  action 中必须有一个 `type` 属性，而且不能等于 `undefined`，这个 type 最好使用一个字符串常量。
     *
     * @returns {Object} 方便起见，dispatch 会返回你传入的 action
     *
     * 注意：如果你使用自定义的中间件，它可能会对 `dispatch()` 的返回值做一些修改。
     */
    function dispatch(action) {
        // 异常处理
        if (!isPlainObject(action)) {
            throw new Error(
                'Actions must be plain objects. ' +
                'Use custom middleware for async actions.'
            )
        }

        if (typeof action.type === 'undefined') {
            throw new Error(
                'Actions may not have an undefined "type" property. ' +
                'Have you misspelled a constant?'
            )
        }

        // reducer 内部不允许再dispatch actions；否则抛出异常
        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions.')
        }

        // 捕获前一个错误，但是会将 isDispatching 置为 false，避免影响后续的 action 执行
        try {
            isDispatching = true
            currentState = currentReducer(currentState, action)
        } finally {
            isDispatching = false
        }

        const listeners = currentListeners = nextListeners
        for (let i = 0; i < listeners.length; i++) {
            // 直接执行 listeners[i]() 会导致函数内部的 this 指向 listeners
            const listener = listeners[i]
            listener()
        }

        return action
    }

    /**
     *
     * 替换 reducer
     * 主要用于
     * 1. hot reload
     * 2. 代码分割，动态更新reducer
     * @param {Function} nextReducer 返回替换过后的reducer
     * @returns {void}
     */
    function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.')
        }

        currentReducer = nextReducer
        dispatch({ type: ActionTypes.INIT })
    }

    /**
     * 为 observable 或 reactive 库提供的API，但是 Redux 中没有看到使用过
     * @returns {observable}
     * 想了解更多关于 observable 的可以看看:
     * https://github.com/tc39/proposal-observable
     */
    function observable() {
        const outerSubscribe = subscribe
        return {
            /**
             * The minimal observable subscription method.
             * @param {Object} observer Any object that can be used as an observer.
             * The observer object should have a `next` method.
             * @returns {subscription} An object with an `unsubscribe` method that can
             * be used to unsubscribe the observable from the store, and prevent further
             * emission of values from the observable.
             */
            subscribe(observer) {
                if (typeof observer !== 'object') {
                    throw new TypeError('Expected the observer to be an object.')
                }

                function observeState() {
                    if (observer.next) {
                        observer.next(getState())
                    }
                }

                observeState()
                const unsubscribe = outerSubscribe(observeState)
                return { unsubscribe }
            },

            [$$observable]() {
                return this
            }
        }
    }


    // 当创建一个 store 时，需呀 dispatch "INIT" action，每个 reducer都会返回初始的 state
    // 此时就构建好了初始的 state 树

    dispatch({ type: ActionTypes.INIT })

    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer,
        [$$observable]: observable
    }
}