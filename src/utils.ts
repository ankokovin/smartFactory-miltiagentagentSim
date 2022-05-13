import LogisticRobotArgs from "./data/environmentSettings/LogisticRobotArgs";
import ProductionRobotArgs from "./data/environmentSettings/ProductionRobotArgs";
import ProviderArgs from "./data/environmentSettings/ProviderArgs";
import StartOrderProportion from "./data/environmentSettings/StartOrderProportion";
import ProductModelEnum from "./data/ProductModelEnum";
import RandomInterval from "./data/RandomInterval";
import Environment from "./Environment";

export function randomNumber(min: number, max: number) : number {
    return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number) : number {
    return Math.floor(randomNumber(min, max));
}

export function getRandom<T>(arr: Array<T>, n?: number) : Array<T> {
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
    } else {
        return getRandom(arr, Math.min(arr.length, randomInt(2, arr.length)))
    }   
}

export function handleMessage(message: string, environment: Environment, messageFn: (o:any) => void) : Environment {
    const data = JSON.parse(message);
    let env = environment
    if (data.isStart) {
        if (environment) {
            environment.stop()
        }
        env = new Environment({
            logFunction: messageFn,
            delay: data.delay,
            iterCount: data.iter,
            logisticRobotArgs: <LogisticRobotArgs>data.logisticRobots,
            productionRobotArgs: <ProductionRobotArgs>data.productionRobots,
            holderCount: data.holderCount,
            defaultInternalEventDelay: <RandomInterval>data.defaultInternalEventDelay,
            defaultCommunicationDelay: <RandomInterval>data.defaultCommunicationDelay,
            customerNewOrderDelay: <RandomInterval>data.customer.newOrderDistribution,
            processMakerRandomParams: {
                inputCount: <RandomInterval>data.processMaker.processMakerInputCount,
                inputQuantity: <RandomInterval>data.processMaker.processMakerInputQuantity,
                outputQuantity: <RandomInterval>data.processMaker.processMakerOutputQuantity,
                primitiveProbability: data.processMaker.processMakerPrimitiveProbability
            },
            processRandomParam: {
                responseTimeoutDelay: <RandomInterval>data.process.responseTimeoutDelay,
                planRetryDelay: <RandomInterval>data.process.planRetryDelay,
            },
            startOrderProportion: <StartOrderProportion>data.customer.startOrderProportion,
            plannerCount: data.planner.count,
            plannerDurations: (() => {
                const map = new Map<ProductModelEnum, RandomInterval>()
                map.set(ProductModelEnum.Text, <RandomInterval>data.planner.duration.text)
                map.set(ProductModelEnum.Image, <RandomInterval>data.planner.duration.image)
                map.set(ProductModelEnum.CAD, <RandomInterval>data.planner.duration.CAD)
                return map
            })(),
            detailTypeCount: data.detailTypeCount,
            resourceTypeCount: data.resourceTypeCount,
            providerArgs: <ProviderArgs>data.provider,
        })
        env.run()
            .then(() => messageFn({topic: "Done"}))
    }
    else if (data.isStop) {
        env.stop()
    }
    else if (data.delay || data.delay === 0) {
        env.delayMs = data.delay
    }
    return env
}