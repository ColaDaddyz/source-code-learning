/**
 * 接受一组函数，从右到左组合，然后返回生成的函数组合
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
    if (funcs.length === 0) {
        return arg => arg
    }

    if (funcs.length === 1) {
        return funcs[0]
    }

    /**
     * 没有initValue，数组的第一位会作为previous，第二位作为current开始迭代
     */
    return funcs.reduce((a, b) => (...args) => a(b(...args)))
}