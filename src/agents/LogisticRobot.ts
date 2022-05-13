import IAgent from '../interfaces/IAgent'
import { randomInt } from '../utils';
import Holder, { HolderPassResourceQuery } from './Holder';
import IMoveable from '../interfaces/IMovable';
import Point from '../data/Point';
import { AgentEventArgument, EventHandler, Time } from '../data/AgentEvent';
import Process, { isProcess } from './Process';
import { Command } from '../data/Command';
import Resource from '../data/material/Resource';
import RandomInterval, { getRandomNumber } from '../data/RandomInterval';

let counter = 0;

export default class LogisticRobot implements IAgent, IMoveable{
    id: string
    position: Point
    speed: number
    isBusy: boolean
    source?: Holder | Point;
    destination?: Holder;
    resource?: Resource;
    commandId?: string;
    callback?: EventHandler;
    prevTime?: Time;
    constructor(
                speed: number, 
                internalEventDelay: RandomInterval, 
                communicationDelay: RandomInterval, 
                position? : Point) {
        this.id = `LogisticRobot-${++counter}`
        this.position = position ?? {x: randomInt(0, 1000), y: randomInt(0, 1000)}
        this.speed = speed
        this.isBusy = false
        this.internalEventDelay = internalEventDelay
        this.communicationDelay = communicationDelay
    }
    internalEventDelay: RandomInterval;
    communicationDelay: RandomInterval;
    updatePosition(newPosition: Point): void {
        this.position = newPosition
        if (this.resource?.isBeingHeld) {
            this.resource.updatePosition(newPosition)
        }
    }

    handleProcessAnnouncement: EventHandler = (time, addNewEvent, process) => {
        if (!isProcess(process)) return
        addNewEvent({
            time: time + 1,
            object: new LogisticRobotBusyReply(!this.isBusy && !this.source, this.id),
            eventHandler: process.handleLogisticAgentAnnouncementResponse
        })
    }

    handlerReserve: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof LogisticRobotReserveQuery)) return
        if (this.isBusy || this.source) {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: query.process.handleReserveLogisticResponse,
                object: new LogisticRobotReserveReply(this.id, false, query.commandId)
            })
        }
        this.isBusy = true
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: query.process.handleReserveLogisticResponse,
            object: new LogisticRobotReserveReply(this.id, true, query.commandId)
        })
    }

    handleUnreserve: EventHandler = (time, addNewEvent) => {
        this.isBusy = false
        if (this.callback && this.commandId) {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay), 
                eventHandler: this.callback, 
                object: new LogisticRobotMoveResult(this.commandId)})
            this.callback = undefined
        }
        this.callback = undefined
        this.source = undefined
        this.destination = undefined
        this.resource = undefined
        this.commandId = undefined
    }

    handleQueueMove: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof LogisticRobotMoveQuery)) return
        this.source = query.command.source
        this.destination = query.command.destination
        this.resource = query.command.resource
        this.callback = query.callback
        this.commandId = query.command.id
        addNewEvent({
            time: time + getRandomNumber(this.internalEventDelay),
            eventHandler: this.move
        })
        this.prevTime = time
    }

    private move: EventHandler = (time, addNewEvent) => {
        if (!this.isBusy || !this.resource || !this.source || !this.destination) return
        const moveRes = this.moveTick(this.resource.isBeingHeld ? this.destination.position : this.resource.position)
        if (!moveRes) {
            console.assert(this.isBusy)
            addNewEvent({
                time: time + getRandomNumber(this.internalEventDelay),
                eventHandler: this.move
            })
            this.prevTime = time
            return
        }
        if (!this.resource.isBeingHeld) {
            console.assert(this.resource.position.x == this.position.x && this.resource.position.y == this.position.y)
            this.resource.isBeingHeld = true
            addNewEvent({
                time: time + getRandomNumber(this.internalEventDelay),
                eventHandler: this.move
            })
            this.prevTime = time
            return
        }
        console.assert(this.destination.position.x == this.position.x && this.destination.position.y == this.position.y)
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: this.destination.handlePassResource,
            object: new HolderPassResourceQuery(this.resource, this.handleUnreserve)
        })
    }

    private moveTick(target: Point) : boolean {
        let vec = {
            x: target.x - this.position.x,
            y: target.y - this.position.y
        }
        const movedDist = this.speed * (this.prevTime ?? 1)
        const mag = vec.x*vec.x+vec.y*vec.y 
        if (mag <= movedDist * movedDist) {
            this.updatePosition({
                x: target.x,
                y: target.y
            })
            return true
            
        } else {
            vec = {
                x: vec.x * this.speed / Math.sqrt(mag),
                y: vec.y * this.speed / Math.sqrt(mag)
            }
            this.updatePosition({
                x: this.position.x + vec.x,
                y: this.position.y + vec.y 
            })
            return false
        }
    }
}

export class LogisticRobotReserveQuery extends AgentEventArgument {
    commandId: string
    process: Process
    constructor(commandId: string, process: Process) {
        super()
        this.commandId = commandId
        this.process = process
    }
}

export class LogisticRobotBusyReply extends AgentEventArgument {
    isReady: boolean
    id: string
    constructor(isReady: boolean, id: string) {
        super()
        this.id = id
        this.isReady = isReady
    }
}

export class LogisticRobotReserveReply extends AgentEventArgument {
    success: boolean
    id: string
    commandId: string
    constructor(id: string, success: boolean, commandId: string) {
        super()
        this.id = id
        this.success = success
        this.commandId = commandId
    }
}

export class LogisticRobotMoveQuery extends AgentEventArgument {
    command: Command
    callback: EventHandler
    constructor(command: Command, callback: EventHandler) {
        super()
        this.command = command
        this.callback = callback
    }
}

export class LogisticRobotMoveResult extends AgentEventArgument {
    commandId: string
    constructor(commandId: string) {
        super()
        this.commandId = commandId
    }
}