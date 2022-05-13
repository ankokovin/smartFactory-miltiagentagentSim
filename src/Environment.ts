import PriorityQueue from 'typescript-collections/dist/lib/PriorityQueue';

import Customer from "./agents/Customer";
import Designer, { designsDone, designsInWorks, resetDesignsCounts } from "./agents/Designer";
import IAgent from "./interfaces/IAgent";
import LogisticRobot from "./agents/LogisticRobot";
import Order, { isOrder } from "./data/Order";
import ResourceType from "./data/types/ResourceType";

import DetailType, { isDetailType } from "./data/types/DetailType";
import ProcessType from "./data/types/ProcessType";
import Provider from "./agents/Provider";
import Message from "./Message";
import ProductionRobotType from "./data/types/ProductionRobotType";
import ProductionRobot from "./agents/ProductionRobot";
import { randomInt } from "./utils";
import Holder, { isHolder } from "./agents/Holder";
import Process, { CreateNewProcesses, isProcess } from "./agents/Process";
import Capability from "./data/process/Capability";
import EnvironmentSettings from "./data/environmentSettings/EnvironmentSettings";
import AgentEvent, { Time } from './data/AgentEvent';
import OrderPlanningQueue, { orderQueue } from './agents/OrderPlanningQueue';
import { ProcessMaker } from './agents/ProcessMaker';
import RandomInterval, { getRandomNumber } from './data/RandomInterval';
import { ProductModelCreationMap, ProductModelCreationMapReset } from './data/ProductModel';
import ProductModelEnum from './data/ProductModelEnum';
import ProductionRobotArgs from './data/environmentSettings/ProductionRobotArgs';
import StartOrderProportion from './data/environmentSettings/StartOrderProportion';
import LogisticRobotArgs from './data/environmentSettings/LogisticRobotArgs';
import ProviderArgs from './data/environmentSettings/ProviderArgs';

export type AddOrderToEnv = (a: Order, t: Time) => void;

export default class Environment {

    log: (topic: string, content : string | object | number) => void;
    iter: number;

    agents: IAgent[];
    delayMs?: number;

    orders: Order[] = [];
    newOrders: Order[] = [];
    
    resourceTypes: ResourceType[] = [];
    productionRobotTypes: ProductionRobotType[] = [];
    processTypes: ProcessType[] = [];

    processes: Process[] = [];
    productionRobots: ProductionRobot[] = [];
    logisticRobots: LogisticRobot[] = [];
    customer: Customer[] = [];
    provider: Provider[] = [];
    capabilities: Capability[] = [];
    holders: Holder[] = [];
    designers: Designer[] = [];
    OrderPlanningQueue: OrderPlanningQueue;
    ProcessMaker: ProcessMaker;
    addNewEventHandler: undefined | ((e: AgentEvent) => void);

    getCleanHolders = () => this.holders.filter(item => isHolder(item))
    halt = false;

    constructor(settings : EnvironmentSettings) {
        this.log = (topic: string, content :any) => settings.logFunction(<Message> {topic, content});
        this.iter = settings.iterCount
        this.log('debug','Creating environment')
        this.loadTypes(settings.detailTypeCount, settings.resourceTypeCount)

        ProductModelCreationMapReset()
        resetDesignsCounts()

        const getHolders = () => this.holders
        const getLogisiticRobots = () => this.logisticRobots
        const getCustomer = () => this.customer[0]


        this.ProcessMaker = new ProcessMaker(
            () => this.resourceTypes,
            (processType) => this.processTypes.push(processType),
            () => this.processTypes,
            (ProcessData, time) => {
                const process = new Process(
                    ProcessData.quantity, 
                    ProcessData.type, 
                    ProcessData.source,
                    () => this.productionRobots,
                    getHolders,
                    getLogisiticRobots,
                    getCustomer,
                    createProcess,
                    settings.defaultCommunicationDelay,
                    settings.defaultInternalEventDelay,
                    settings.processRandomParam
                    ) 
                this.processes.push(process)
                this.agents.push(process)
                if (this.addNewEventHandler) {
                    this.addNewEventHandler({
                        time: time + getRandomNumber(settings.defaultInternalEventDelay),
                        eventHandler: process.start 
                    })
                }
                return process
            }, 
            (capability) => this.capabilities.push(capability),
            () => this.productionRobotTypes,
            settings.processMakerRandomParams
        )

        const createProcess : CreateNewProcesses = (input, parentProcess, time) => {
            if (!isDetailType(input.type)) {
                throw new Error()
            } 
            let processType = this.processTypes.find(type => type.output.type.id === input.type.id)
            if (!processType) {
                processType = this.ProcessMaker.createPrimitiveProcess(input.type)
            }
            const newProcess = new Process(
                input.quantity, 
                processType, 
                parentProcess, 
                () => this.productionRobots,
                getHolders, 
                getLogisiticRobots,
                getCustomer,
                createProcess,
                settings.defaultCommunicationDelay,
                settings.defaultInternalEventDelay,
                settings.processRandomParam)
            this.processes.push(newProcess)
            this.agents.push(newProcess)
            if (this.addNewEventHandler) {
                this.addNewEventHandler({
                    time: time + getRandomNumber(settings.defaultInternalEventDelay),
                    eventHandler: newProcess.start 
                })
            }
            return newProcess
        }

        this.OrderPlanningQueue = new OrderPlanningQueue(
            () => this.designers,
            settings.defaultCommunicationDelay
        )
        this.designers = new Array(settings.plannerCount).fill({})
            .map(() => new Designer(
                () => this.OrderPlanningQueue, 
                () => this.ProcessMaker,
                settings.defaultCommunicationDelay, 
                settings.plannerDurations))

            
        this.agents = [
            ...this.createCustomer(settings.defaultCommunicationDelay, settings.customerNewOrderDelay, settings.startOrderProportion),
            ...this.designers,
            ...this.createProviders(settings.defaultCommunicationDelay, settings.providerArgs),
            ...this.createHolders(settings.holderCount, settings.defaultCommunicationDelay),
            ...this.createLogisticRobots(
                    settings.logisticRobotArgs, 
                    settings.defaultInternalEventDelay, 
                    settings.defaultCommunicationDelay),
            ...this.createProductionRobots(settings.productionRobotArgs, settings.defaultCommunicationDelay),    
        ]
        this.delayMs = settings.delay;
    }

    async run() {

        const queue = new PriorityQueue<AgentEvent>((a: AgentEvent, b: AgentEvent) => b.time - a.time)

        this.addNewEventHandler = (e: AgentEvent) => {
            queue.add(e)
        }
        queue.add({time: 0, eventHandler: this.customer[0].newOrderEvent})
        queue.add({time: 0, eventHandler: this.provider[0].checkOrders})
        this.log('resourceTypes', this.resourceTypes);

        const handleNewAgentEvent = (e: AgentEvent | undefined) => {
            if (e && this.addNewEventHandler) {
                const result = e.eventHandler(e.time, this.addNewEventHandler, e.object)
                maxTime = Math.max(maxTime, e.time)
            }
        }

        let maxTime = 0
        
        for (let i = 0; i < this.iter && !this.halt; i++) {
            if (!queue.isEmpty()) {
                handleNewAgentEvent(queue.dequeue())
            } 

            if (this.delayMs !== 0 || i % 100 === 0 || i === this.iter - 1) {
                this.log('iteration', {current: i + 1, total: this.iter});
                this.log('time', maxTime)
                this.log('orders',  {
                    total: this.orders.length,
                    done: this.orders.filter(order => order.isDone).length
                });
                const reportProcesses = (processes: Process[]) => {
                    return {
                        total: processes.length,
                        started: processes.filter(process => process.currentPlan).length,
                        manufatured: processes.filter(process => process.result).length,
                        done: processes.filter(process => process.isCompleted).length,
                    }
                }
                this.log('processes', {
                    all:        reportProcesses(this.processes),
                    primitive:  reportProcesses(this.processes.filter(process => process.isPrimitive)),
                    simple:     reportProcesses(this.processes.filter(process => process.isPrimitive && isOrder(process.source))),
                    parents:    reportProcesses(this.processes.filter(process => !process.isPrimitive)),
                    children:   reportProcesses(this.processes.filter(process => isProcess(process.source)))
                });
                this.log('logisticRobots', this.logisticRobots);
                this.log('productionRobots', this.productionRobots);
                this.log('holders', this.getCleanHolders());
                this.log('provider', this.provider);
                this.log('customer', this.customer);
                this.log('customerCreatedModels', ProductModelCreationMap);
                this.log('designsInWorks', [...designsInWorks.entries()].map(([type, val]) => [type.toString(), val]));
                this.log('designsInQueue', (() => {
                    const res : any = {}
                    res[ProductModelEnum.Text.toString()] =  0
                    res[ProductModelEnum.Image.toString()] =  0
                    res[ProductModelEnum.CAD.toString()] =  0
                    res[ProductModelEnum.Process.toString()] =  0

                    orderQueue.forEach(order => {
                        res[order.currentProductModel.type.toString()] = res[order.currentProductModel.type.toString()] + 1
                    })
                    return res})())
                this.log('designsDone', [...designsDone.entries()].map(([type, val]) => [type.toString(), val]))
            }
            if (this.delayMs) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }  
        }
    }

    loadTypes(detailTypeCount:number, resourceTypeCount:number){
        const resourceTypes : ResourceType[] = new Array(detailTypeCount).fill({}).map((_, index) => {return {id:`ResourceType-${index}`}})
        const detailTypes : DetailType[] = new Array(resourceTypeCount).fill({}).map((_, index) => new DetailType(`DetailType-${index}`))
        this.resourceTypes = [
            ...resourceTypes, 
            ...detailTypes
            ]
    }

    createProductionRobots(args: ProductionRobotArgs, defaultCommunicationDelay: RandomInterval) : ProductionRobot[] {
        this.productionRobotTypes = new Array(args.typeCount)
            .fill({})
            .map((_, index) => new ProductionRobotType(index.toString()))
        
        this.productionRobots = []
        let done = 0
        const getCapabilities = (p: ProductionRobot) => this.capabilities.filter(item => item.productionRobotType.id === p.type.id)
        for (let index = 0; index < this.productionRobotTypes.length; index++) {
            const type = this.productionRobotTypes[index];
            const thisCount = (index === this.productionRobotTypes.length - 1) 
                                ? args.count - done
                                : randomInt(1, args.count - done - (this.productionRobotTypes.length - index - 1))
            this.productionRobots = [
                ...this.productionRobots, 
                ...new Array(thisCount)
                    .fill({})
                    .map(_ => new ProductionRobot(type, getCapabilities, defaultCommunicationDelay, args.duration))]
            done += thisCount
        }
        this.holders = [...this.holders]
        return this.productionRobots
    }

    createLogisticRobots(
            args: LogisticRobotArgs,
            internalEventDelay: RandomInterval,
            defaultCommunicationDelay: RandomInterval) : LogisticRobot[] {
        this.logisticRobots = new Array(args.count).fill({})
            .map(() => new LogisticRobot(args.speed, internalEventDelay, defaultCommunicationDelay))  
        return this.logisticRobots
    }

    createProviders(defaultCommunicationDelay: RandomInterval, args: ProviderArgs) : Provider[] {
        const provider = new Provider(
            () => this.holders,
            () => this.processes,
            (id) => this.resourceTypes.find(type => type.id === id),
            defaultCommunicationDelay, 
            args)
        this.holders.push(provider)
        this.provider.push(provider)
        return [provider]
    }

    createHolders(count: number, defaultCommunicationDelay: RandomInterval) : Holder[] {
        const holders =  new Array(count).fill({}).map((_) => new Holder(defaultCommunicationDelay))
        this.holders = [...this.holders, ...holders]
        return holders
    }

    createCustomer(defaultCommunicationDelay: RandomInterval, orderIntervalDelay: RandomInterval, startOrderProportion: StartOrderProportion) : Customer[] {
        const customer = [new Customer(
                (order: Order, time:Time) => {
                    this.orders.push(order)
                    if (!this.addNewEventHandler) return
                    this.addNewEventHandler({
                        time,
                        eventHandler: this.OrderPlanningQueue.handleAddOrder,
                        object: order
                    })},
                defaultCommunicationDelay, 
                orderIntervalDelay, 
                startOrderProportion, 
                () => this.processTypes,
                )]
        this.customer = customer
        return customer
    }

    stop() {
        this.halt = true
    }
}