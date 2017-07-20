import isPlainObject from 'lodash/isPlainObject';
import {ActionTypes} from './createStore';
import warning from './utils/warning';

function getUndefinedStateErrorMessage(key, action) {
    const actionType = action && action.type;
    const actionName = (actionType && `"${actionType.toString()}"`) || 'an action';

    return (
        `Given action ${actionName}, reducer "${key}" returned undefined. ` +
        `To ignore an action, you must explicitly return the previous state. ` +
        `If you want this reducer to hold no value, you can return null instead of undefined.`
    );
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
    const reducerKeys = Object.keys(reducers);
    const argumentName = action && action.type === ActionTypes.INIT ?
        'preloadedState argument passed to createStore' :
        'previous state received by the reducer';

    if (reducerKeys.length === 0) {
        return (
            'Store does not have a valid reducer. Make sure the argument passed ' +
            'to combineReducers is an object whose values are reducers.'
        );
    }

    if (!isPlainObject(inputState)) {
        return (
            `The ${argumentName} has unexpected type of "` +
            ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
            `". Expected argument to be an object with the following ` +
            `keys: "${reducerKeys.join('", "')}"`
        );
    }

    const unexpectedKeys = Object.keys(inputState).filter(key =>
        !reducers.hasOwnProperty(key) &&
        !unexpectedKeyCache[key]
    );

    unexpectedKeys.forEach(key => {
        unexpectedKeyCache[key] = true;
    });

    if (unexpectedKeys.length > 0) {
        return (
            `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
            `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
            `Expected to find one of the known reducer keys instead: ` +
            `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
        );
    }
}

function assertReducerShape(reducers) {
    Object.keys(reducers).forEach(key => {
        const reducer = reducers[key];
        const initialState = reducer(undefined, {type: ActionTypes.INIT});

        // 初始化不能返回 undefined
        if (typeof initialState === 'undefined') {
            throw new Error(
                `Reducer "${key}" returned undefined during initialization. ` +
                `If the state passed to the reducer is undefined, you must ` +
                `explicitly return the initial state. The initial state may ` +
                `not be undefined. If you don't want to set a value for this reducer, ` +
                `you can use null instead of undefined.`
            );
        }

        const type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
        if (typeof reducer(undefined, {type}) === 'undefined') {
            throw new Error(
                `Reducer "${key}" returned undefined when probed with a random type. ` +
                `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
                `namespace. They are considered private. Instead, you must return the ` +
                `current state for any unknown actions, unless it is undefined, ` +
                `in which case you must return the initial state, regardless of the ` +
                `action type. The initial state may not be undefined, but can be null.`
            );
        }
    })
}

/**
 *
 * 将包含多个 reducer 函数的对象转换成一个 reducer 函数。
 * 它会调用每个子 reducer，并且将结果合并成一个 state 对象，这个对象的 key 取决于 reducer 函数的 key
 *
 * @param {Object} reducers
 * 一个需要被合并的 reducer 对象。最好使用 ES6 的 `import * as reducers` 来引用他们。
 * reducers 不能返回 undefined。如果传入的 action 是 undefined，reducer 应该返回初始化的 state。
 *
 * @returns {Function}
 * 返回一个 reducer 函数，它包含所有传入的 reducer，并且生成一个 state 对象
 */
export default function combineReducers(reducers) {
    const reducerKeys = Object.keys(reducers);
    const finalReducers = {};
    for (let i = 0; i < reducerKeys.length; i++) {
        const key = reducerKeys[i];

        if (process.env.NODE_ENV !== 'production') {
            if (typeof reducers[key] === 'undefined') {
                warning(`No reducer provided for key "${key}"`);
            }
        }

        if (typeof reducers[key] === 'function') {
            // 一轮清洗后获取最后的 reducer map
            finalReducers[key] = reducers[key];
        }
    }
    const finalReducerKeys = Object.keys(finalReducers);

    let unexpectedKeyCache;
    if (process.env.NODE_ENV !== 'production') {
        unexpectedKeyCache = {};
    }

    let shapeAssertionError;
    try {
        assertReducerShape(finalReducers);
    } catch (e) {
        // combine时不抛出，执行时才抛出异常
        shapeAssertionError = e;
    }

    return function combination(state = {}, action) {
        if (shapeAssertionError) {
            throw shapeAssertionError;
        }

        if (process.env.NODE_ENV !== 'production') {
            const warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);
            if (warningMessage) {
                warning(warningMessage);
            }
        }

        let hasChanged = false;
        const nextState = {};
        for (let i = 0; i < finalReducerKeys.length; i++) {
            const key = finalReducerKeys[i];
            const reducer = finalReducers[key];
            // 获取前一次reducer
            const previousStateForKey = state[key];
            // 获取当前reducer
            const nextStateForKey = reducer(previousStateForKey, action);
            if (typeof nextStateForKey === 'undefined') {
                const errorMessage = getUndefinedStateErrorMessage(key, action);
                throw new Error(errorMessage);
            }
            nextState[key] = nextStateForKey;
            // 判断是否改变
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
        }
        // 如果没改变，返回前一个state，否则返回新的state
        // 目的：可以方便调用方判断数据是否变化，比如 react 可以不重新渲染
        return hasChanged ? nextState : state;
    }
}