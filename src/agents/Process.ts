import IAgent from "../interfaces/IAgent";
import ProcessType from "../data/types/ProcessType";
import ProductionRobot from "./ProductionRobot";
import Holder from "./Holder";
import ProcessInput from "../data/process/ProcessInput";
import { chooseClosest , Dist } from "../interfaces/ILocatable";
import LogisticRobot from "./LogisticRobot";
import ResourceType, { isResourceType } from "../data/types/ResourceType";
import Resource from "../data/material/Resource";
import Order, { isOrder } from "../data/Order";
import Customer from "./Customer";
import Detail from "../data/material/Detail";
import { getRandom } from "../utils";
import { isDetailType } from "../data/types/DetailType";

var idx = 0;

type AnnounceToProductionAgents = (a:Process) => ProductionRobot[]
type AnnounceToHolders = () => Holder[]
type AnnounceToLogisticRobots = () => LogisticRobot[]
type GetCustomer = () => Customer
type GetCleanHolders = () => Holder[]
export type CreateNewProcesses = (a:ProcessInput, b:Process) => Process
export default class Process implements IAgent {
    type: ProcessType
    id: string
    requestedQuantity: number
    isProcess: boolean = true
    isAwaitingPlanning: boolean
    isAwaitingPalningResultDelivery: boolean
    isAwaitingResultDelivery: boolean
    isDeliveredToRobot: boolean
    isPrimitive: boolean
    isCompleted: boolean
    announceToProductionAgents: () => ProductionRobot[];
    announceToHolders: () => Holder[];
    announceToLogisticRobots: () => LogisticRobot[];
    getCustomer: GetCustomer
    createNewProcesses: CreateNewProcesses
    GetCleanHolders: GetCleanHolders
    currentInputs: ProcessInput[];

    logisticCounter: number = -1;
    childProcessesCount: number = -1;

    selectedProductionRobot?: ProductionRobot;
    selectedResources? : Resource[];
    processCount: number;
    source: Process | Order;
    result?: Detail;
    constructor(quantity: number, 
        type: ProcessType, 
        source: Process | Order,
        AnnounceToProductionAgents: AnnounceToProductionAgents, 
        AnnounceToHolders: AnnounceToHolders, 
        AnnounceToLogisticRobots: AnnounceToLogisticRobots,
        GetCustomer: GetCustomer,
        createNewProcesses: CreateNewProcesses,
        GetCleanHolders: GetCleanHolders)  {
        this.type = type;
        this.requestedQuantity = quantity;
        this.id = `ManufacturingProcess-${++idx}`
        this.isAwaitingPlanning = true
        this.isAwaitingPalningResultDelivery = false
        this.isAwaitingResultDelivery = false
        this.isDeliveredToRobot = false
        this.isCompleted = false
        this.source = source

        this.processCount = Math.ceil(this.requestedQuantity / this.type.output.quantity)
        this.currentInputs = type.input.map(input => {return {type : input.type, quantity: input.quantity * this.processCount}})
        this.announceToProductionAgents = () => AnnounceToProductionAgents(this);
        this.announceToHolders = () => AnnounceToHolders();
        this.announceToLogisticRobots = () => AnnounceToLogisticRobots();
        this.getCustomer = GetCustomer
        this.createNewProcesses = createNewProcesses
        this.isPrimitive = type.input.every(item => isResourceType(item.type))
        this.GetCleanHolders = GetCleanHolders
    }

    run(turn?: number) {
        if (this.isCompleted) return

        if (this.childProcessesCount > 0) return

        if (this.selectedProductionRobot && this.isDeliveredToRobot) {
                const deficit = this.countDeficit(this.selectedProductionRobot.reserved.resources)
            if (deficit.length === 0) {
                console.log(`${this.id} ready!`)
                let result = this.selectedProductionRobot.manufacture(this)
                if (result == null) {
                    throw new Error("Unexpected no result for manufacture process")
                }
                this.result = result
                this.isAwaitingPalningResultDelivery = true
            } else {
                this.currentInputs = deficit
                this.isAwaitingPlanning = true
            }
            this.isDeliveredToRobot = false
        }

        if (this.isAwaitingPlanning) {
            //if (this.isPrimitive) {
            this.plan();
        }
        
        if (this.isAwaitingPalningResultDelivery) {
            this.delivery()
        }
    }

    countDeficit(resources: Map<string, number>): { type: ResourceType; quantity: number; }[] {
        const res = this.type.input
            .map(input => {
                    const totalCount = resources.get(input.type.id)
                    return {
                        totalCount,
                        input
                    }
                }
            )
            .map(item => {
                return {
                    type: item.input.type,
                    quantity: item.input.quantity * this.processCount - (item.totalCount??0) 
                }
            })
            .filter(item => item.quantity > 0)
        return res 
    }

    plan() {
        let possibleProductionAgents = this.selectedProductionRobot ? [this.selectedProductionRobot] : this.announceToProductionAgents()
        if (possibleProductionAgents.length === 0) return;
        if (isProcess(this.source)) {
            console.log("huh?")
        }
        let logisticRobots = this.announceToLogisticRobots()
        if (logisticRobots.length === 0) return
        if (logisticRobots.length < this.currentInputs.length) {
            this.currentInputs = getRandom(this.currentInputs, logisticRobots.length)
        }
        let holders = this.announceToHolders()
        let filteredInputCandidates = this.currentInputs
            .map(input =>  {
                let filteredHolders : Holder[] = holders.filter(holder => holder.announce(input))
                return {input, filteredHolders}
            })
            .reduce((map, pair) => {
                const input : ProcessInput = pair.input
                const holders = pair.filteredHolders
                map.set(input, holders)
                return map
            }, new Map<ProcessInput, Holder[]>() )
        
        let problems = [...filteredInputCandidates.entries()].filter(([_, ar]) => ar.length === 0) 
        if (problems.length !== 0) {
            console.log("not enough resources")
            let childProcesses = problems
                                    .map(([item, _]) => item)
                                    .filter(item => isDetailType(item.type))
                                    .map(item => this.createNewProcesses(item, this))
            this.childProcessesCount = childProcesses.length
            return;
        }
        console.log("enought resources: ", this.id)
        let bestCandidates = possibleProductionAgents.map(productionRobot => {
            return {
                commands: [...filteredInputCandidates.entries()]
                .map(([input, holders]) => {
                    return {
                        input, 
                        holder: holders.reduce((holder, nHolder) => {
                            if (!holder) return nHolder;
                            return chooseClosest(holder, nHolder, productionRobot)
                        })}}),
                productionRobot
            }
        })
        
        let resultingBest = bestCandidates.map(arr => {
            const nLogisticRobots = new Set(logisticRobots)
            return  { 
                commands : arr.commands.map(item => {
                    const robot = [...nLogisticRobots.values()].reduce((robot, nrobot) => {
                        if (!robot) return nrobot;
                        return chooseClosest(robot, nrobot, item.holder)
                    })
                    nLogisticRobots.delete(robot)
                    return {
                        ...item,
                        logistic: robot
                    }
                }),
                productionRobot: arr.productionRobot
            }
        }).sort((a, b) => {
            let distA = a.commands.reduce((val, item) => val + Dist(item.holder, item.logistic), 0)
            let distB = b.commands.reduce((val, item) => val + Dist(item.holder, item.logistic), 0)
            return distA - distB
        })[0]
        resultingBest.commands.forEach(command => {
            const res = command.holder.getResource(command.input.type, command.input.quantity * this.processCount)
            if (!res) {
                throw new Error('no res? why?')
            }
            res.isReserved = true
            this.isDeliveredToRobot = false
            command.logistic.pickupResource(res, resultingBest.productionRobot.reserved, () => {
                this.logisticCounter -= 1
                if (this.logisticCounter <= 0) {
                    this.isDeliveredToRobot = true
                }
            })
        })
        this.selectedProductionRobot = resultingBest.productionRobot
        this.selectedProductionRobot.isBusy = true
        this.isAwaitingPlanning = false;
    }

    delivery() {
        if (isOrder(this.source)) {
            if (!this.result) {
                throw new Error('Unexpected no result')
            }
            let logisticRobots = this.announceToLogisticRobots()
            if (logisticRobots.length === 0) {
                console.log("Not enougth logistic robots")
                return;
            }
            const customer = this.getCustomer()
            let robot = logisticRobots.sort((a, b) => {
                let distA = Dist(a, customer)
                let distB = Dist(b, customer)
                return distA - distB
            })[0]
            robot.pickupResource(this.result, customer, () => {
                if (isOrder(this.source)) {
                    if (!this.result) {
                        throw new Error('Unexpected no result')
                    }
                    this.isCompleted = true
                    this.source.isDone = true
                    console.log(`${this.id} completed!`)
                }
            })
            this.isAwaitingPalningResultDelivery = false
            this.isAwaitingResultDelivery = true
            console.log(`Final delivery started ${this.id}`)
            return
        }
        if (isProcess(this.source)) {
            if (!this.result) {
                throw new Error('Unexpected no result')
            }
            let logisticRobots = this.announceToLogisticRobots()
            if (logisticRobots.length === 0) {
                console.log("Not enougth logistic robots")
                return;
            }
            const holder = getRandom(this.GetCleanHolders(), 1)[0]
            let robot = logisticRobots.sort((a, b) => {
                let distA = Dist(a, holder)
                let distB = Dist(b, holder)
                return distA - distB
            })[0]
            robot.pickupResource(this.result, holder, () => {
                this.isCompleted = true
                if (isProcess(this.source))
                --this.source.childProcessesCount
                console.log(`${this.id} completed!`)
            } )
            this.isAwaitingPalningResultDelivery = false
            this.isAwaitingResultDelivery = true
            console.log(`Final delivery started ${this.id}`)
            return
        }
        throw new Error("Unknown source")
    }
 }

export function isProcess(object: any): object is Process {
    return object?.id?.startsWith?.('ManufacturingProcess')
}