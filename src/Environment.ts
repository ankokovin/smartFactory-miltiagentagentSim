import Customer from "./agents/Customer";
import Designer from "./agents/Designer";
import IAgent from "./interfaces/IAgent";
import LogisticRobot from "./agents/LogisticRobot";
import Order, { isOrder } from "./data/Order";
import ResourceType from "./data/types/ResourceType";

import {default as ResourceTypes} from "./json/ResourceTypes.json";
import {default as DetailTypes} from "./json/DetailTypes.json";
import DetailType, { isDetailType } from "./data/types/DetailType";
import ProcessType from "./data/types/ProcessType";
import Provider from "./agents/Provider";
import Resource from "./data/material/Resource";
import Message from "./Message";
import ProductionRobotType from "./data/types/ProductionRobotType";
import ProductionRobot, { isProductionRobot } from "./agents/ProductionRobot";
import { randomInt } from "./utils";
import Holder, { isHolder } from "./agents/Holder";
import Process, { CreateNewProcesses, isProcess } from "./agents/Process";
import Capability from "./data/process/Capability";
import EnvironmentSettings from "./EnvironmentSettings";

export default class Environment {

    log: (topic: string, content :any) => void;
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
    Designer: Designer;

    getCleanHolders = () => this.holders.filter(item => isHolder(item))

    constructor(setting : EnvironmentSettings) {
        this.log = (topic: string, content :any) => setting.logFunction(<Message> {topic, content});
        this.iter = setting.iterCount
        this.log('debug','Creating environment')
        this.loadTypes()


        const getHolders = () => this.holders
        const getLogisiticRobots = () => this.logisticRobots.filter(robot => !robot.target)
        const getCustomer = () => this.customer[0]
        

        const createProcess : CreateNewProcesses = (input, parentProcess) => {
            if (!isDetailType(input.type)) {
                throw new Error()
            } 
            let processType = this.processTypes.find(type => type.output.type.id === input.type.id)
            if (!processType) {
                processType = this.Designer.createPrimitiveProcess(input.type)
            }
            let newProcess = new Process(
                input.quantity, 
                processType, 
                parentProcess, 
                (process) => this.productionRobots
                    .filter(robot => !robot.isBusy 
                        && robot.getCapabilities().some(cap => cap.processType == process.type)),
                getHolders, 
                getLogisiticRobots,
                getCustomer,
                createProcess, 
                this.getCleanHolders)
            this.processes.push(newProcess)
            this.agents.push(newProcess)
            return newProcess
        }

        this.Designer = new Designer(
            () => this.newOrders,
            () => this.resourceTypes,
            (processType) => this.processTypes.push(processType),
            () => this.processTypes,
            (ProcessData) => {
                let process = new Process(
                    ProcessData.quantity, 
                    ProcessData.type, 
                    ProcessData.source,
                    (process) => this.productionRobots
                        .filter(robot => !robot.isBusy 
                            && robot.getCapabilities().some(cap => cap.processType == process.type)),
                    getHolders,
                    getLogisiticRobots,
                    getCustomer,
                    createProcess,
                    this.getCleanHolders) 
                this.processes.push(process)
                this.agents.push(process)
                return process
            }, 
            (capability) => this.capabilities.push(capability),
            () => this.productionRobotTypes)

            
        this.agents = [
            ...this.createCustomer(setting.orderProbability),
            this.Designer,
            ...this.createProviders(),
            ...this.createHolders(),
            ...this.createLogisticRobots(setting.logisticRobotCount, setting.logisticRobotSpeed),
            ...this.createProductionRobots(setting.productionRobotCount),    
        ]
        this.delayMs = setting.delay;
    }

    async run() {
        this.log('resourceTypes', this.resourceTypes);
        for (let i = 0; i < this.iter; i++) {
            if (this.delayMs !== 0 || i % 1000 === 0 || i === this.iter - 1) this.log('iteration', {current: i + 1, total: this.iter});
            let orders: Order[] = []
            for (const agent of this.agents) {
                const res = agent.run(i);
                if (isOrder(res)) {
                    orders.push(res);
                }
            }

            this.newOrders = orders;
            this.orders = [...this.orders, ...this.newOrders];  

            if (this.delayMs !== 0 || i % 1000 === 0 || i === this.iter - 1) {
                this.log('orders',  {
                    total: this.orders.length,
                    done: this.orders.filter(order => order.isDone).length
                });
                const reportProcesses = (processes: Process[]) => {
                    return {
                        total: processes.length,
                        started: processes.filter(process => process.selectedProductionRobot).length,
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
            }
            if (this.delayMs) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }     
        }
    }

    loadTypes(){
        this.resourceTypes = [
            ...ResourceTypes, 
            ...DetailTypes
                .map(t => new DetailType(t.id))
            ]
    }

    createProductionRobots(count: number) : ProductionRobot[] {
        this.productionRobotTypes = new Array(Math.min(count, randomInt(2, count - 1)))
            .fill({})
            .map((_, index) => new ProductionRobotType(index.toString()))
        


        this.productionRobots = []
        let done = 0
        const getCapabilities = (p: ProductionRobot) => this.capabilities.filter(item => item.productionRobotType.id === p.type.id)
        for (let index = 0; index < this.productionRobotTypes.length; index++) {
            const type = this.productionRobotTypes[index];
            const thisCount = (index === this.productionRobotTypes.length - 1) 
                                ? count - done
                                : randomInt(1, count - done - (this.productionRobotTypes.length - index - 1))
            this.productionRobots = [
                ...this.productionRobots, 
                ...new Array(thisCount)
                    .fill({})
                    .map(_ => new ProductionRobot(type, getCapabilities))]
            done += thisCount
        }
        this.holders = [...this.holders, ...this.productionRobots]
        return this.productionRobots
    }

    createLogisticRobots(count: number, speed: number) : LogisticRobot[] {
        this.logisticRobots = new Array(count).fill({}).map(() => new LogisticRobot(speed))  
        return this.logisticRobots
    }

    createProviders() : Provider[] {
        const provider = new Provider(
            () => this.holders,
            () => this.processes,
            (id) => this.resourceTypes.find(type => type.id === id))
        this.holders.push(provider)
        this.provider.push(provider)
        return [provider]
    }

    createHolders(count: number = 5) : Holder[] {
        const holders =  new Array(count).fill({}).map((_) => new Holder())
        this.holders = [...this.holders, ...holders]
        return holders
    }

    createCustomer(orderProbability: number) : Customer[] {
        const customer = [new Customer(orderProbability)]
        this.customer = customer
        return customer
    }

    stop() {
        this.iter = -1
    }
}