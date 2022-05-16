import IAgent from '../interfaces/IAgent'
import { randomInt } from '../utils';
import Holder from './Holder';
import IMoveable from '../interfaces/IMovable';
import Point from '../data/Point';
import { EventHandler, Time } from '../data/AgentEvent';
import { isProcess } from './Process';
import Resource from '../data/material/Resource';
import RandomInterval, { getRandomNumber } from '../data/RandomInterval';
import LogisticRobotBusyReply from '../query/LogisticRobotBusyReply';
import LogisticRobotReserveQuery from '../query/LogisticRobotReserveQuery';
import LogisticRobotReserveReply from '../query/LogisticRobotReserveReply';
import LogisticRobotMoveResult from '../query/LogisticRobotMoveResult';
import LogisticRobotMoveQuery from '../query/LogisticRobotMoveQuery';
import HolderPassResourceQuery from '../query/HolderPassResourceQuery';

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
            time: time + getRandomNumber(this.communicationDelay),
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

