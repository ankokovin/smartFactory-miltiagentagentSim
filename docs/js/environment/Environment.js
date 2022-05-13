var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import PriorityQueue from "./lib/typescript-collections/PriorityQueue.js"
import Customer from "./agents/Customer.js";
import Designer, { designsDone, designsInWorks, resetDesignsCounts } from "./agents/Designer.js";
import LogisticRobot from "./agents/LogisticRobot.js";
import { isOrder } from "./data/Order.js";
import DetailType, { isDetailType } from "./data/types/DetailType.js";
import Provider from "./agents/Provider.js";
import ProductionRobotType from "./data/types/ProductionRobotType.js";
import ProductionRobot from "./agents/ProductionRobot.js";
import { randomInt } from "./utils.js";
import Holder, { isHolder } from "./agents/Holder.js";
import Process, { isProcess } from "./agents/Process.js";
import OrderPlanningQueue, { orderQueue } from "./agents/OrderPlanningQueue.js";
import { ProcessMaker } from "./agents/ProcessMaker.js";
import { getRandomNumber } from "./data/RandomInterval.js";
import { ProductModelCreationMap, ProductModelCreationMapReset } from "./data/ProductModel.js";
import ProductModelEnum from "./data/ProductModelEnum.js";
export default class Environment {
    constructor(setting) {
        this.orders = [];
        this.newOrders = [];
        this.resourceTypes = [];
        this.productionRobotTypes = [];
        this.processTypes = [];
        this.processes = [];
        this.productionRobots = [];
        this.logisticRobots = [];
        this.customer = [];
        this.provider = [];
        this.capabilities = [];
        this.holders = [];
        this.designers = [];
        this.getCleanHolders = () => this.holders.filter(item => isHolder(item));
        this.halt = false;
        this.log = (topic, content) => setting.logFunction({ topic, content });
        this.iter = setting.iterCount;
        this.log('debug', 'Creating environment');
        this.loadTypes(setting.detailTypeCount, setting.resourceTypeCount);
        ProductModelCreationMapReset();
        resetDesignsCounts();
        const getHolders = () => this.holders;
        const getLogisiticRobots = () => this.logisticRobots;
        const getCustomer = () => this.customer[0];
        this.ProcessMaker = new ProcessMaker(() => this.resourceTypes, (processType) => this.processTypes.push(processType), () => this.processTypes, (ProcessData, time) => {
            const process = new Process(ProcessData.quantity, ProcessData.type, ProcessData.source, () => this.productionRobots, getHolders, getLogisiticRobots, getCustomer, createProcess, setting.defaultCommunicationDelay, setting.defaultInternalEventDelay, setting.processRandomParam);
            this.processes.push(process);
            this.agents.push(process);
            if (this.addNewEventHandler) {
                this.addNewEventHandler({
                    time: time + getRandomNumber(setting.defaultInternalEventDelay),
                    eventHandler: process.start
                });
            }
            return process;
        }, (capability) => this.capabilities.push(capability), () => this.productionRobotTypes, setting.processMakerRandomParams);
        const createProcess = (input, parentProcess, time) => {
            if (!isDetailType(input.type)) {
                throw new Error();
            }
            let processType = this.processTypes.find(type => type.output.type.id === input.type.id);
            if (!processType) {
                processType = this.ProcessMaker.createPrimitiveProcess(input.type);
            }
            const newProcess = new Process(input.quantity, processType, parentProcess, () => this.productionRobots, getHolders, getLogisiticRobots, getCustomer, createProcess, setting.defaultCommunicationDelay, setting.defaultInternalEventDelay, setting.processRandomParam);
            this.processes.push(newProcess);
            this.agents.push(newProcess);
            if (this.addNewEventHandler) {
                this.addNewEventHandler({
                    time: time + getRandomNumber(setting.defaultInternalEventDelay),
                    eventHandler: newProcess.start
                });
            }
            return newProcess;
        };
        this.OrderPlanningQueue = new OrderPlanningQueue(() => this.designers, setting.defaultCommunicationDelay);
        this.designers = new Array(setting.plannerCount).fill({})
            .map(() => new Designer(() => this.OrderPlanningQueue, () => this.ProcessMaker, setting.defaultCommunicationDelay, setting.plannerDurations));
        this.agents = [
            ...this.createCustomer(setting.defaultCommunicationDelay, setting.customerNewOrderDelay, setting.startOrderProportion),
            ...this.designers,
            ...this.createProviders(setting.defaultCommunicationDelay),
            ...this.createHolders(setting.holderCount, setting.defaultCommunicationDelay),
            ...this.createLogisticRobots(setting.logisticRobotArgs, setting.defaultInternalEventDelay, setting.defaultCommunicationDelay),
            ...this.createProductionRobots(setting.productionRobotArgs, setting.defaultCommunicationDelay),
        ];
        this.delayMs = setting.delay;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const queue = new PriorityQueue((a, b) => b.time - a.time);
            this.addNewEventHandler = (e) => {
                queue.add(e);
            };
            queue.add({ time: 0, eventHandler: this.customer[0].newOrderEvent });
            queue.add({ time: 0, eventHandler: this.provider[0].checkOrders });
            this.log('resourceTypes', this.resourceTypes);
            const handleNewAgentEvent = (e) => {
                if (e && this.addNewEventHandler) {
                    const result = e.eventHandler(e.time, this.addNewEventHandler, e.object);
                    maxTime = Math.max(maxTime, e.time);
                }
            };
            let maxTime = 0;
            for (let i = 0; i < this.iter && !this.halt; i++) {
                if (!queue.isEmpty()) {
                    handleNewAgentEvent(queue.dequeue());
                }
                if (this.delayMs !== 0 || i % 100 === 0 || i === this.iter - 1) {
                    this.log('iteration', { current: i + 1, total: this.iter });
                    this.log('time', maxTime);
                    this.log('orders', {
                        total: this.orders.length,
                        done: this.orders.filter(order => order.isDone).length
                    });
                    const reportProcesses = (processes) => {
                        return {
                            total: processes.length,
                            started: processes.filter(process => process.currentPlan).length,
                            manufatured: processes.filter(process => process.result).length,
                            done: processes.filter(process => process.isCompleted).length,
                        };
                    };
                    this.log('processes', {
                        all: reportProcesses(this.processes),
                        primitive: reportProcesses(this.processes.filter(process => process.isPrimitive)),
                        simple: reportProcesses(this.processes.filter(process => process.isPrimitive && isOrder(process.source))),
                        parents: reportProcesses(this.processes.filter(process => !process.isPrimitive)),
                        children: reportProcesses(this.processes.filter(process => isProcess(process.source)))
                    });
                    this.log('logisticRobots', this.logisticRobots);
                    this.log('productionRobots', this.productionRobots);
                    this.log('holders', this.getCleanHolders());
                    this.log('provider', this.provider);
                    this.log('customer', this.customer);
                    this.log('customerCreatedModels', ProductModelCreationMap);
                    this.log('designsInWorks', [...designsInWorks.entries()].map(([type, val]) => [type.toString(), val]));
                    this.log('designsInQueue', (() => {
                        const res = {};
                        res[ProductModelEnum.Text.toString()] = 0;
                        res[ProductModelEnum.Image.toString()] = 0;
                        res[ProductModelEnum.CAD.toString()] = 0;
                        res[ProductModelEnum.Process.toString()] = 0;
                        orderQueue.forEach(order => {
                            res[order.currentProductModel.type.toString()] = res[order.currentProductModel.type.toString()] + 1;
                        });
                        return res;
                    })());
                    this.log('designsDone', [...designsDone.entries()].map(([type, val]) => [type.toString(), val]));
                }
                if (this.delayMs) {
                    yield new Promise(resolve => setTimeout(resolve, this.delayMs));
                }
            }
        });
    }
    loadTypes(detailTypeCount, resourceTypeCount) {
        const resourceTypes = new Array(detailTypeCount).fill({}).map((_, index) => { return { id: `ResourceType-${index}` }; });
        const detailTypes = new Array(resourceTypeCount).fill({}).map((_, index) => new DetailType(`DetailType-${index}`));
        this.resourceTypes = [
            ...resourceTypes,
            ...detailTypes
        ];
    }
    createProductionRobots(args, defaultCommunicationDelay) {
        this.productionRobotTypes = new Array(args.typeCount)
            .fill({})
            .map((_, index) => new ProductionRobotType(index.toString()));
        this.productionRobots = [];
        let done = 0;
        const getCapabilities = (p) => this.capabilities.filter(item => item.productionRobotType.id === p.type.id);
        for (let index = 0; index < this.productionRobotTypes.length; index++) {
            const type = this.productionRobotTypes[index];
            const thisCount = (index === this.productionRobotTypes.length - 1)
                ? args.count - done
                : randomInt(1, args.count - done - (this.productionRobotTypes.length - index - 1));
            this.productionRobots = [
                ...this.productionRobots,
                ...new Array(thisCount)
                    .fill({})
                    .map(_ => new ProductionRobot(type, getCapabilities, defaultCommunicationDelay, args.duration))
            ];
            done += thisCount;
        }
        this.holders = [...this.holders];
        return this.productionRobots;
    }
    createLogisticRobots(args, internalEventDelay, defaultCommunicationDelay) {
        this.logisticRobots = new Array(args.count).fill({})
            .map(() => new LogisticRobot(args.speed, internalEventDelay, defaultCommunicationDelay));
        return this.logisticRobots;
    }
    createProviders(defaultCommunicationDelay) {
        const provider = new Provider(() => this.holders, () => this.processes, (id) => this.resourceTypes.find(type => type.id === id), defaultCommunicationDelay);
        this.holders.push(provider);
        this.provider.push(provider);
        return [provider];
    }
    createHolders(count, defaultCommunicationDelay) {
        const holders = new Array(count).fill({}).map((_) => new Holder(defaultCommunicationDelay));
        this.holders = [...this.holders, ...holders];
        return holders;
    }
    createCustomer(defaultCommunicationDelay, orderIntervalDelay, startOrderProportion) {
        const customer = [new Customer((order, time) => {
                this.orders.push(order);
                if (!this.addNewEventHandler)
                    return;
                this.addNewEventHandler({
                    time,
                    eventHandler: this.OrderPlanningQueue.handleAddOrder,
                    object: order
                });
            }, defaultCommunicationDelay, orderIntervalDelay, startOrderProportion, () => this.processTypes)];
        this.customer = customer;
        return customer;
    }
    stop() {
        this.halt = true;
    }
}
