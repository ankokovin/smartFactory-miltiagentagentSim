import ProductModelEnum from "./data/ProductModelEnum.js";
import Environment from "./Environment.js";
export function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}
export function randomInt(min, max) {
    return Math.floor(randomNumber(min, max));
}
export function getRandom(arr, n) {
    const result = new Array(n);
    let len = arr.length;
    const taken = new Array(len);
    if (n) {
        if (n > len)
            throw new RangeError("getRandom: more elements taken than available");
        while (n--) {
            const x = Math.floor(Math.random() * len);
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
    let env = environment;
    if (data.isStart) {
        if (environment) {
            environment.stop();
        }
        env = new Environment({
            logFunction: messageFn,
            delay: data.delay,
            iterCount: data.iter,
            logisticRobotArgs: data.logisticRobots,
            productionRobotArgs: data.productionRobots,
            holderCount: data.holderCount,
            defaultInternalEventDelay: data.defaultInternalEventDelay,
            defaultCommunicationDelay: data.defaultCommunicationDelay,
            customerNewOrderDelay: data.customer.newOrderDistribution,
            processMakerRandomParams: {
                inputCount: data.processMaker.processMakerInputCount,
                inputQuantity: data.processMaker.processMakerInputQuantity,
                outputQuantity: data.processMaker.processMakerOutputQuantity,
                primitiveProbability: data.processMaker.processMakerPrimitiveProbability
            },
            processRandomParam: {
                responseTimeoutDelay: data.process.responseTimeoutDelay,
                planRetryDelay: data.process.planRetryDelay,
            },
            startOrderProportion: data.customer.startOrderProportion,
            plannerCount: data.planner.count,
            plannerDurations: (() => {
                const map = new Map();
                map.set(ProductModelEnum.Text, data.planner.duration.text);
                map.set(ProductModelEnum.Image, data.planner.duration.image);
                map.set(ProductModelEnum.CAD, data.planner.duration.CAD);
                return map;
            })(),
            detailTypeCount: data.detailTypeCount,
            resourceTypeCount: data.resourceTypeCount,
            providerArgs: data.provider,
        });
        env.run()
            .then(() => messageFn({ topic: "Done" }));
    }
    else if (data.isStop) {
        env.stop();
    }
    else if (data.delay || data.delay === 0) {
        env.delayMs = data.delay;
    }
    return env;
}
