import { randomInt } from "../utils.js";
import { HolderPassResourceQuery } from "./Holder.js";
import { AgentEventArgument } from "../data/AgentEvent.js";
import { isProcess } from "./Process.js";
import { getRandomNumber } from "../data/RandomInterval.js";
let counter = 0;
export default class LogisticRobot {
    constructor(speed, internalEventDelay, communicationDelay, position) {
        this.handleProcessAnnouncement = (time, addNewEvent, process) => {
            if (!isProcess(process))
                return;
            addNewEvent({
                time: time + 1,
                object: new LogisticRobotBusyReply(!this.isBusy && !this.source, this.id),
                eventHandler: process.handleLogisticAgentAnnouncementResponse
            });
        };
        this.handlerReserve = (time, addNewEvent, query) => {
            if (!(query instanceof LogisticRobotReserveQuery))
                return;
            if (this.isBusy || this.source) {
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: query.process.handleReserveLogisticResponse,
                    object: new LogisticRobotReserveReply(this.id, false, query.commandId)
                });
            }
            this.isBusy = true;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: query.process.handleReserveLogisticResponse,
                object: new LogisticRobotReserveReply(this.id, true, query.commandId)
            });
        };
        this.handleUnreserve = (time, addNewEvent) => {
            this.isBusy = false;
            if (this.callback && this.commandId) {
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: this.callback,
                    object: new LogisticRobotMoveResult(this.commandId)
                });
                this.callback = undefined;
            }
            this.callback = undefined;
            this.source = undefined;
            this.destination = undefined;
            this.resource = undefined;
            this.commandId = undefined;
        };
        this.handleQueueMove = (time, addNewEvent, query) => {
            if (!(query instanceof LogisticRobotMoveQuery))
                return;
            this.source = query.command.source;
            this.destination = query.command.destination;
            this.resource = query.command.resource;
            this.callback = query.callback;
            this.commandId = query.command.id;
            addNewEvent({
                time: time + getRandomNumber(this.internalEventDelay),
                eventHandler: this.move
            });
            this.prevTime = time;
        };
        this.move = (time, addNewEvent) => {
            if (!this.isBusy || !this.resource || !this.source || !this.destination)
                return;
            const moveRes = this.moveTick(this.resource.isBeingHeld ? this.destination.position : this.resource.position);
            if (!moveRes) {
                console.assert(this.isBusy);
                addNewEvent({
                    time: time + getRandomNumber(this.internalEventDelay),
                    eventHandler: this.move
                });
                this.prevTime = time;
                return;
            }
            if (!this.resource.isBeingHeld) {
                console.assert(this.resource.position.x == this.position.x && this.resource.position.y == this.position.y);
                this.resource.isBeingHeld = true;
                addNewEvent({
                    time: time + getRandomNumber(this.internalEventDelay),
                    eventHandler: this.move
                });
                this.prevTime = time;
                return;
            }
            console.assert(this.destination.position.x == this.position.x && this.destination.position.y == this.position.y);
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.destination.handlePassResource,
                object: new HolderPassResourceQuery(this.resource, this.handleUnreserve)
            });
        };
        this.id = `LogisticRobot-${++counter}`;
        this.position = position !== null && position !== void 0 ? position : { x: randomInt(0, 1000), y: randomInt(0, 1000) };
        this.speed = speed;
        this.isBusy = false;
        this.internalEventDelay = internalEventDelay;
        this.communicationDelay = communicationDelay;
    }
    updatePosition(newPosition) {
        var _a;
        this.position = newPosition;
        if ((_a = this.resource) === null || _a === void 0 ? void 0 : _a.isBeingHeld) {
            this.resource.updatePosition(newPosition);
        }
    }
    moveTick(target) {
        var _a;
        let vec = {
            x: target.x - this.position.x,
            y: target.y - this.position.y
        };
        const movedDist = this.speed * ((_a = this.prevTime) !== null && _a !== void 0 ? _a : 1);
        const mag = vec.x * vec.x + vec.y * vec.y;
        if (mag <= movedDist * movedDist) {
            this.updatePosition({
                x: target.x,
                y: target.y
            });
            return true;
        }
        else {
            vec = {
                x: vec.x * this.speed / Math.sqrt(mag),
                y: vec.y * this.speed / Math.sqrt(mag)
            };
            this.updatePosition({
                x: this.position.x + vec.x,
                y: this.position.y + vec.y
            });
            return false;
        }
    }
}
export class LogisticRobotReserveQuery extends AgentEventArgument {
    constructor(commandId, process) {
        super();
        this.commandId = commandId;
        this.process = process;
    }
}
export class LogisticRobotBusyReply extends AgentEventArgument {
    constructor(isReady, id) {
        super();
        this.id = id;
        this.isReady = isReady;
    }
}
export class LogisticRobotReserveReply extends AgentEventArgument {
    constructor(id, success, commandId) {
        super();
        this.id = id;
        this.success = success;
        this.commandId = commandId;
    }
}
export class LogisticRobotMoveQuery extends AgentEventArgument {
    constructor(command, callback) {
        super();
        this.command = command;
        this.callback = callback;
    }
}
export class LogisticRobotMoveResult extends AgentEventArgument {
    constructor(commandId) {
        super();
        this.commandId = commandId;
    }
}
