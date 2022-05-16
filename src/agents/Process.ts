import Point from '../data/Point';
import IAgent from "../interfaces/IAgent";
import ProcessType from "../data/types/ProcessType";
import ProductionRobot from "./ProductionRobot";
import ManifactureResult from "../query/ManifactureResult";
import ProductionRobotReply from "../query/ProductionRobotReply";
import ProcessInput from "../data/process/ProcessInput";
import { chooseClosest , Dist } from "../interfaces/ILocatable";
import LogisticRobot from "./LogisticRobot";
import LogisticRobotBusyReply from "../query/LogisticRobotBusyReply";
import ResourceType, { isResourceType } from "../data/types/ResourceType";
import Order, { isOrder } from "../data/Order";
import Customer from "./Customer";
import Detail from "../data/material/Detail";
import { getRandom } from "../utils";
import { isDetailType } from "../data/types/DetailType";
import { AddNewEvent, EventHandler, Time } from "../data/AgentEvent";
import Holder from "./Holder";
import HolderAnnoucementReply from "../query/HolderAnnoucementReply";
import HolderUnreserveQuery from "../query/HolderUnreserveQuery";
import HolderReserveQuery from "../query/HolderReserveQuery";
import { Command } from "../data/Command";
import { Plan } from "../data/Plan";
import RandomInterval, { getRandomNumber } from '../data/RandomInterval';
import ProcessRandomParam from '../data/environmentSettings/ProcessRandomParams';
import HolderReserveResponse from '../query/HolderReserveResponse';
import LogisticRobotMoveQuery from '../query/LogisticRobotMoveQuery';
import LogisticRobotMoveResult from '../query/LogisticRobotMoveResult';
import LogisticRobotReserveQuery from '../query/LogisticRobotReserveQuery';
import LogisticRobotReserveReply from '../query/LogisticRobotReserveReply';
import ProductionRobotReserveResult from '../query/ProductionRobotReserveResult';
import ReservedStatus from '../query/ReservedStatus';
import ReservedStatusQuery from '../query/ReservedStatusQuery';
import StartManufactureQuery from '../query/StartManufactureQuery';

let idx = 0;

type GetProductionAgents = () => ProductionRobot[]
type GetHolders = () => Holder[]
type GetLogisticRobots = () => LogisticRobot[]
type GetCustomer = () => Customer

export type CreateNewProcesses = (a:ProcessInput, b:Process, t:Time) => Process
export default class Process implements IAgent {
    type: ProcessType
    id: string
    requestedQuantity: number
    isProcess = true
    isAwaitingPlanning = false;
    isAwaitingPalningResultDelivery = false;
    isAwaitingResultDelivery = false;
    isDeliveredToRobot = false;
    isPrimitive: boolean
    isCompleted = false;
    getProductionAgents: () => ProductionRobot[];
    getHolders: () => Holder[];
    getLogisticRobots: () => LogisticRobot[];
    getCustomer: GetCustomer
    createNewProcesses: CreateNewProcesses
    currentInputs: ProcessInput[];
    logisticCounter = -1;
    childProcessesCount = -1;
    productionRobotCandidates: ProductionRobot[] = [];
    logisticRobotCandidates: LogisticRobot[] = [];
    holdersCandidates: Map<ResourceType, Holder[]> = new Map<ResourceType, Holder[]>();
    currentPlan?: Plan;
    finalDeliveryCommand?: Command;
    processCount: number;
    source: Process | Order;
    result?: Detail;
    processRandomParam: ProcessRandomParam;

    constructor(quantity: number, 
        type: ProcessType, 
        source: Process | Order,
        GetProductionAgents: GetProductionAgents, 
        GetHolders: GetHolders, 
        GetLogisticRobots: GetLogisticRobots,
        GetCustomer: GetCustomer,
        createNewProcesses: CreateNewProcesses,
        communicationDelay: RandomInterval, 
        internalEventDelay: RandomInterval,
        processRandomParam: ProcessRandomParam)  {
        this.type = type;
        this.requestedQuantity = quantity;
        this.id = `ManufacturingProcess-${++idx}`
        
        this.source = source

        this.processCount = Math.ceil(this.requestedQuantity / this.type.output.quantity)
        this.currentInputs = this.calcExpectedInputs()
        this.getProductionAgents = GetProductionAgents;
        this.getHolders = () => GetHolders();
        this.getLogisticRobots = GetLogisticRobots;
        this.getCustomer = GetCustomer
        this.createNewProcesses = createNewProcesses
        this.isPrimitive = type.input.every(item => isResourceType(item.type))
        this.communicationDelay = communicationDelay
        this.internalEventDelay = internalEventDelay
        this.processRandomParam = processRandomParam
        this.resetState()
    }
    communicationDelay: RandomInterval;
    internalEventDelay: RandomInterval;

    private calcExpectedInputs = () => {
        return this.type.input.map(input => {return {type : input.type, quantity: input.quantity * this.processCount}})
    }

    private resetState() {
        this.isAwaitingPlanning = true
        this.isAwaitingPalningResultDelivery = false
        this.isAwaitingResultDelivery = false
        this.isDeliveredToRobot = false
        this.isCompleted = false
    }

    start: EventHandler = (time, addNewEvent) => {
        console.log('started', this.id, time)
        this.resetState()
        this.gatherInfo(time, addNewEvent)
    }

    gatherInfo : EventHandler = (time, addNewEvent) => {
        this.holdersCandidates = this.type.input.reduce((map, val) => map.set(val.type, []), new Map())
        this.logisticRobotCandidates = []
        this.productionRobotCandidates = []
        this.getProductionAgents()
            .map(prod => addNewEvent(
                {
                    time: time + getRandomNumber(this.communicationDelay),
                    object: this,
                    eventHandler: prod.handleProcessAnnouncement 
                }))
        this.getLogisticRobots()
            .map(logis => addNewEvent(
                {
                    time: time + getRandomNumber(this.communicationDelay),
                    object: this,
                    eventHandler: logis.handleProcessAnnouncement
                }
        ))
        this.getHolders()
            .map(hold => addNewEvent(
                {
                    time: time + getRandomNumber(this.communicationDelay),
                    object: this,
                    eventHandler: hold.handleProcessAnnouncementHolder
                }
            ))
        addNewEvent({
            time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay),
            eventHandler: this.plan
        })
    }

    handleProdAgentAnnouncementResponse : EventHandler = (_time, _addNewEvent, productionRobotReply) => {
        if (!(productionRobotReply instanceof ProductionRobotReply) || !productionRobotReply.isReady) return
        const productionRobot = this.getProductionAgents().filter(agent => agent.id == productionRobotReply.id)[0]
        if (!productionRobot) return
        this.productionRobotCandidates.push(productionRobot)
    }

    handleLogisticAgentAnnouncementResponse : EventHandler = (_time, _addNewEvent, logisticRobotBusyReply) => {
        if (!(logisticRobotBusyReply instanceof LogisticRobotBusyReply) || !logisticRobotBusyReply.isReady) return
        const logisticRobot = this.getLogisticRobots().filter(agent => agent.id == logisticRobotBusyReply.id)[0]
        if (!logisticRobot) return
        this.logisticRobotCandidates.push(logisticRobot)
    }

    handleHolderAgentAnnouncementResponse : EventHandler = (_time, _addNewEvent, holderAnnoucementReply) => {
        if (!(holderAnnoucementReply instanceof HolderAnnoucementReply)) return
        const holder = this.getHolders().filter(holder => holder.id == holderAnnoucementReply.id)[0]
        if (!holder) return
        for (const [input, isAvailable] of holderAnnoucementReply.availableInputs) {
            if (!isAvailable) continue
            const inputType = input.type
            if (this.holdersCandidates.has(input.type)) {
                this.holdersCandidates.get(input.type)?.push(holder)
            } else {
                this.holdersCandidates.set(input.type, [holder])
            }
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

    plan : EventHandler = (time, addNewEvent) => {
        console.log('plan', this.id, time)

        const retry = () => {
            addNewEvent({time: time + getRandomNumber(this.processRandomParam.planRetryDelay), eventHandler: this.gatherInfo})
        }
        const possibleProductionAgents = this.currentPlan?.productionRobot ? [this.currentPlan?.productionRobot] : this.productionRobotCandidates
        const logisticRobots = this.logisticRobotCandidates
        if (logisticRobots.length == 0 || possibleProductionAgents.length === 0) {
            retry()
            return
        }
        this.currentInputs = this.currentInputs.filter(input => input.quantity > 0)
        if (logisticRobots.length < this.currentInputs.length) {
            this.currentInputs = getRandom(this.currentInputs, logisticRobots.length)
        }
        const filteredInputCandidates = this.currentInputs
            .map(input =>  {
                const filteredHolders : Holder[] = this.holdersCandidates.get(input.type) ?? []
                return {input, filteredHolders}
            })
            .reduce((map, pair) => {
                const input : ProcessInput = pair.input
                const holders = pair.filteredHolders
                map.set(input, holders)
                return map
            }, new Map<ProcessInput, Holder[]>() )
        const problems = [...filteredInputCandidates.entries()].filter(([_, ar]) => ar.length === 0) 

        if (problems.length !== 0) {
            const childProcesses = problems
                                    .map(([item, _]) => item)
                                    .filter(item => isDetailType(item.type))
                                    .map(item => this.createNewProcesses(item, this, time))
            
            this.isAwaitingPlanning = true
            if (childProcesses.length === 0) {
                retry()
                return
            }
            this.childProcessesCount = childProcesses.length
            addNewEvent({time: time + getRandomNumber(this.internalEventDelay), eventHandler: this.unreserveResources})
            return;
        }
        const bestCandidates = possibleProductionAgents.map(productionRobot => {
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
        const resultingBest = bestCandidates.map(arr => {
            const nLogisticRobots = new Set(logisticRobots)
            if (nLogisticRobots.size === 0) return null
            const res =  { 
                commands : arr.commands.map(item => {
                    if (nLogisticRobots.size === 0) return null
                    let curCandidates = [...nLogisticRobots.values()]
                    const robot = curCandidates.reduce((robot, nrobot) => {
                        if (!robot) return nrobot;
                        return chooseClosest(robot, nrobot, item.holder)
                    })
                    nLogisticRobots.delete(robot)
                    curCandidates = []
                    return {
                        ...item,
                        logistic: robot
                    }
                }).filter(command => command != null),
                productionRobot: arr.productionRobot
            }
            nLogisticRobots.clear()
            return res
        })
        .sort((a, b) => {
            if (!a) return -1
            if (!b) return 1
            const distA = a.commands.reduce((val, item) => item ? val + Dist(item.holder, item.logistic) : 0, 0)
            const distB = b.commands.reduce((val, item) => item ? val + Dist(item.holder, item.logistic) : 0, 0)
            return a.commands.length === b.commands.length ? distA - distB : b.commands.length - a.commands.length
        })[0]
        if (resultingBest == null) {
            retry()
            return
        }
        const prodRobot = resultingBest.productionRobot
        const commands = resultingBest.commands
            .filter(obj => !!obj)
            .map(obj => {
                if (!obj) throw Error()
                return new Command(
                    obj.holder, 
                    prodRobot.reservedInput, 
                    obj.logistic, 
                    obj.input)
            })
        this.currentPlan = new Plan(commands, resultingBest.productionRobot) 
        commands.forEach(command => {
            if ((command.source instanceof Point) || !command.input) throw new Error()
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: command.source.handleReserveResource,
                object: new HolderReserveQuery(command.input.type, command.input.quantity * this.processCount, this, command.id)
            })
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: command.logistic.handlerReserve,
                object: new LogisticRobotReserveQuery(command.id, this)
            })
        })
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: this.currentPlan.productionRobot.handleReserve,
            object: this
        })
        this.isAwaitingPlanning = false;
        addNewEvent({
            time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay),
            eventHandler: this.planInputDelivery
        })
        
    }

    handleReserveResourceResponse: EventHandler = (_time, _addNewEvent, response) => {
        if (!(response instanceof HolderReserveResponse) || !this.currentPlan?.commands) return
        const command = this.currentPlan?.commands.filter((com) => com.id == response.commandId)[0]

        if (!response.result || !command) {
            return
        }
        command.setResource(response.result) 
    }

    handleReserveLogisticResponse: EventHandler = (_time, _addNewEvent, response) => {
        if (!(response instanceof LogisticRobotReserveReply) || !this.currentPlan?.commands) return
        const command = this.currentPlan?.commands.filter((com) => com.id == response.commandId)[0]

        if (!response.success) {
            return
        }

        if (!command && this.finalDeliveryCommand?.id === response.commandId) {
            this.finalDeliveryCommand.setLogisticLocked()
            return
        }

        if (!command) return
        command.setLogisticLocked()
    }

    handleReserveProductionResponse: EventHandler = (_time, _addNewEvent, response) => {
        if (!(response instanceof ProductionRobotReserveResult)) return
        if (!response.success || !this.currentPlan || this.currentPlan.productionRobot.id != response.id) {
            return
        }

        this.currentPlan.productionRobotIsReserved = true
    }

    planInputDelivery: EventHandler = (time, addNewEvent) => {
        if (!this.currentPlan || this.currentPlan.commands?.every((com) => !com.logisticLocked || !com.resource)) {
            this.unreserveResources(time, addNewEvent)
            addNewEvent({
                time: time + getRandomNumber(this.processRandomParam.planRetryDelay),
                eventHandler: this.gatherInfo
            })
            this.currentPlan = undefined
            return
        }
        const succesfullyLockedCommands : Command[] = [], unlockCommands : Command[] = []
        this.currentPlan.commands
            .forEach((command) => {
                if (command.logisticLocked && command.resource) {
                    return succesfullyLockedCommands.push(command)
                } else {
                    return unlockCommands.push(command)
                }
            })
        succesfullyLockedCommands
            .forEach(command => {
                if (!command.resource) throw new Error()
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: command.logistic.handleQueueMove,
                    object: new LogisticRobotMoveQuery(command, this.logisticToManufactureDone)
                })
        })
        console.log('succesfullyLockedCommands', succesfullyLockedCommands.length, this.id, time)

        unlockCommands.forEach(command => {
            this.unreserveCommand(command, time, addNewEvent)
        })                
    }

    private logisticToManufactureDone: EventHandler = (time, addNewEvent, result) => {
        if (!(result instanceof LogisticRobotMoveResult)) return
        const lCommand = this.currentPlan?.commands.filter(com => com.id == result.commandId)[0]
        if(lCommand) lCommand.done = true
        this.checkManufacture(time + getRandomNumber(this.internalEventDelay), addNewEvent)
    }

    private checkManufacture: EventHandler = (time, addNewEvent) => {
        console.log('checkManufacture', this.id, time)

        if (!this.currentPlan) return
        const ready = this.currentPlan.commands.every(com => com.done)
        if (!ready) return
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: this.currentPlan.productionRobot.handleCurrentResourceStatus,
            object: new ReservedStatusQuery(this.receiveCurResStatus)
        })        
    }

    private receiveCurResStatus: EventHandler = (time, addNewEvent, status) => {
        console.log('receiveCurResStatus', this.id, time)
        if (!(status instanceof ReservedStatus)) return
        this.currentInputs = this.calcExpectedInputs()
            .map((item) => {return {
                type: item.type,
                quantity: Math.max(0, (item.quantity - (status.resources.get(item.type.id) ?? 0))) 
            }})
        if (!this.currentPlan) return
        if (this.currentInputs.every(input => input.quantity <= 0)){
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.currentPlan.productionRobot.manufacture,
                object: new StartManufactureQuery(this, this.manufactureDone)
            })
            return
        }
        addNewEvent({
            time: time + getRandomNumber(this.internalEventDelay),
            eventHandler: this.gatherInfo
        })
    } 

    private manufactureDone: EventHandler = (time, addNewEvent, result) => {
        if(!(result instanceof ManifactureResult)) return
        console.log('manifactureDone', this.id, time)
        this.result = result.detail
        addNewEvent({
            time: time + getRandomNumber(this.internalEventDelay),
            eventHandler: this.delivery
        })
    }

    private unreserveCommand(command: Command, time: Time, addNewEvent: AddNewEvent) {
        if (command.done) return
        if (command.resource && !(command.source instanceof Point)) {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: command.source.handleUnreserveResource,
                object: new HolderUnreserveQuery(command.resource, this)
            })
        }
        if (command.logisticLocked) {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: command.logistic.handleUnreserve
            })
        }
    }

    private unreserveResources: EventHandler = (time, addNewEvent) => {
        if (!this.currentPlan?.commands) return
        this.currentPlan.commands.forEach((command) => {
            this.unreserveCommand(command, time, addNewEvent)
        })
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: this.currentPlan.productionRobot.handleUnreserve 
        })
    }

    private delivery: EventHandler = (time, addNewEvent) => {
        console.log('delivery', this.id, time)
        if (!this.result) {
            throw new Error('Unexpected no result')
        }
        this.logisticRobotCandidates = []
        this.getLogisticRobots()
            .map(logis => addNewEvent(
                {
                    time: time + getRandomNumber(this.communicationDelay),
                    object: this,
                    eventHandler: logis.handleProcessAnnouncement
                }
            ))
        
        addNewEvent({time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay), eventHandler: this.tryDelivery})
    }

    private tryDelivery : EventHandler = (time, addNewEvent) => {
        console.log('tryDelivery', this.id, time)
        if (!this.result) throw new Error()
        if (this.logisticRobotCandidates.length === 0) {
            addNewEvent({
                time: time + getRandomNumber(this.processRandomParam.planRetryDelay),
                eventHandler: this.delivery
            })
            return
        }
        const target = isOrder(this.source) ? this.getCustomer() : getRandom(this.getHolders())[0]
        const robot = this.logisticRobotCandidates.sort((a, b) => {
            const distA = Dist(a, target)
            const distB = Dist(b, target)
            return distA - distB
        })[0]
        this.finalDeliveryCommand = new Command(this.result.position, target, robot)
        this.finalDeliveryCommand.setResource(this.result)
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: robot.handlerReserve,
            object: new LogisticRobotReserveQuery(this.finalDeliveryCommand.id, this)
        }) 

        addNewEvent({
            time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay),
            eventHandler: this.logisticToResult
        })
    }

    private logisticToResult: EventHandler = (time, addNewEvent) => {
        console.log('logisticToResult', this.id, time)

        if (!this.finalDeliveryCommand || !this.finalDeliveryCommand.logisticLocked) {
            if (this.finalDeliveryCommand) {
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: this.finalDeliveryCommand.logistic.handleUnreserve
                })
            }
            this.finalDeliveryCommand = undefined
            addNewEvent({
                time: time + getRandomNumber(this.processRandomParam.planRetryDelay),
                eventHandler: this.delivery
            })
            return
        }
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: this.finalDeliveryCommand.logistic.handleQueueMove,
            object: new LogisticRobotMoveQuery(this.finalDeliveryCommand, this.logisticToResultDone)
        })
    }

    private logisticToResultDone: EventHandler = (time, addNewEvent, result) => {
        console.log('logisticToResultDone', this.id, time)

        if (!(result instanceof LogisticRobotMoveResult)) return
        this.isCompleted = true
        if (isOrder(this.source)) {
            this.isCompleted = true
            this.source.done()
        } else {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.source.handleChildProcessDone
            })
        }
    }

    private handleChildProcessDone: EventHandler = (time, addNewEvent) => {
        --this.childProcessesCount
        if (this.childProcessesCount <= 0) {
            addNewEvent({
                time: time + getRandomNumber(this.internalEventDelay),
                eventHandler: this.gatherInfo
            })
        }
    }
 }

export function isProcess(object: any): object is Process {
    return object?.id?.startsWith?.('ManufacturingProcess')
}