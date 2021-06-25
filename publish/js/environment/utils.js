import Environment from "./Environment.js";
export function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}
export function randomInt(min, max) {
    return Math.floor(randomNumber(min, max));
}
export function getRandom(arr, n) {
    var result = new Array(n), len = arr.length, taken = new Array(len);
    if (n) {
        if (n > len)
            throw new RangeError("getRandom: more elements taken than available");
        while (n--) {
            var x = Math.floor(Math.random() * len);
            result[n] = arr[x in taken ? taken[x] : x];
            taken[x] = --len in taken ? taken[len] : len;
        }
        return result;
    }
    else {
        return getRandom(arr, Math.min(arr.length, randomInt(2, arr.length)));
    }
}
export function handleMessage(message, environment, messageFn) {
    const data = JSON.parse(message);
    if (data.isStart) {
        if (environment) {
            environment.stop();
        }
        environment = new Environment({
            logFunction: messageFn,
            delay: data.delay,
            iterCount: data.iter,
            logisticRobotCount: data.logisticRobotCount,
            productionRobotCount: data.productionRobotCount,
            orderProbability: data.orderProbability,
            logisticRobotSpeed: data.logisticRobotSpeed
        });
        environment.run()
            .then(() => messageFn({ topic: "Done" }));
    }
    else if (data.isStop) {
        environment.stop();
    }
    else if (data.delay || data.delay === 0) {
        environment.delayMs = data.delay;
    }
    return environment;
}
