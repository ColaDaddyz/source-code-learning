function debounce(fn, delay, options = {}) {
    let last_call;
    let context;//上下文
    let args; //参数
    let now;
    let {leading, trailing, maxWait} = options;
    let timer;
    let first = true; // leading时能否触发的flag

    let exec = function () {
        last_call = new Date().getTime();
        fn.apply(context, args);
    };

    return function () {
        context = this;
        args = arguments;

        now = new Date().getTime();

        clearTimeout(timer);
        timer = setTimeout(function () {
            if (trailing) {
                exec();
            }

            // 保证下一次leading可用
            first = true;
            // 要重置last_call 保证停止再执行的情况下时间无误
            last_call = null;
        }, delay);

        if (first && leading) {
            first = false;
            exec();
            return;
        }

        if (maxWait && !last_call) {
            last_call = now;
        }
        if (maxWait && now - last_call >= maxWait) {
            exec();
        }

    };
};
_.debounce = debounce;
_.throttle = function (fn, delay, option) {
    return debounce(fn, delay, {
        ...option,
        maxWait: delay
    });
};