import Point from "../data/Point.js";
import ManifactureResult from "../query/ManifactureResult.js";
import ProductionRobotReply from "../query/ProductionRobotReply.js";
import { chooseClosest, Dist } from "../interfaces/ILocatable.js";
import LogisticRobotBusyReply from "../query/LogisticRobotBusyReply.js";
import { isResourceType } from "../data/types/ResourceType.js";
import { isOrder } from "../data/Order.js";
import { getRandom } from "../utils.js";
import { isDetailType } from "../data/types/DetailType.js";
import HolderAnnoucementReply from "../query/HolderAnnoucementReply.js";
import HolderUnreserveQuery from "../query/HolderUnreserveQuery.js";
import HolderReserveQuery from "../query/HolderReserveQuery.js";
import { Command } from "../data/Command.js";
import { Plan } from "../data/Plan.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import HolderReserveResponse from "../query/HolderReserveResponse.js";
import LogisticRobotMoveQuery from "../query/LogisticRobotMoveQuery.js";
import LogisticRobotMoveResult from "../query/LogisticRobotMoveResult.js";
import LogisticRobotReserveQuery from "../query/LogisticRobotReserveQuery.js";
import LogisticRobotReserveReply from "../query/LogisticRobotReserveReply.js";
import ProductionRobotReserveResult from "../query/ProductionRobotReserveResult.js";
import ReservedStatus from "../query/ReservedStatus.js";
import ReservedStatusQuery from "../query/ReservedStatusQuery.js";
import StartManufactureQuery from "../query/StartManufactureQuery.js";
let idx = 0;
export default class Process {
    constructor(quantity, type, source, GetProductionAgents, GetHolders, GetLogisticRobots, GetCustomer, createNewProcesses, communicationDelay, internalEventDelay, processRandomParam) {
        this.isProcess = true;
        this.isAwaitingPlanning = false;
        this.isAwaitingPalningResultDelivery = false;
        this.isAwaitingResultDelivery = false;
        this.isDeliveredToRobot = false;
        this.isCompleted = false;
        this.logisticCounter = -1;
        this.childProcessesCount = -1;
        this.productionRobotCandidates = [];
        this.logisticRobotCandidates = [];
        this.holdersCandidates = new Map();
        this.calcExpectedInputs = () => {
            return this.type.input.map(input => { return { type: input.type, quantity: input.quantity * this.processCount }; });
        };
        this.start = (time, addNewEvent) => {
            console.log('started', this.id, time);
            this.resetState();
            this.gatherInfo(time, addNewEvent);
        };
        this.gatherInfo = (time, addNewEvent) => {
            this.holdersCandidates = this.type.input.reduce((map, val) => map.set(val.type, []), new Map());
            this.logisticRobotCandidates = [];
            this.productionRobotCandidates = [];
            this.getProductionAgents()
                .map(prod => addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: this,
                eventHandler: prod.handleProcessAnnouncement
            }));
            this.getLogisticRobots()
                .map(logis => addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: this,
                eventHandler: logis.handleProcessAnnouncement
            }));
            this.getHolders()
                .map(hold => addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: this,
                eventHandler: hold.handleProcessAnnouncementHolder
            }));
            addNewEvent({
                time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay),
                eventHandler: this.plan
            });
        };
        this.handleProdAgentAnnouncementResponse = (_time, _addNewEvent, productionRobotReply) => {
            if (!(productionRobotReply instanceof ProductionRobotReply) || !productionRobotReply.isReady)
                return;
            const productionRobot = this.getProductionAgents().filter(agent => agent.id == productionRobotReply.id)[0];
            if (!productionRobot)
                return;
            this.productionRobotCandidates.push(productionRobot);
        };
        this.handleLogisticAgentAnnouncementResponse = (_time, _addNewEvent, logisticRobotBusyReply) => {
            if (!(logisticRobotBusyReply instanceof LogisticRobotBusyReply) || !logisticRobotBusyReply.isReady)
                return;
            const logisticRobot = this.getLogisticRobots().filter(agent => agent.id == logisticRobotBusyReply.id)[0];
            if (!logisticRobot)
                return;
            this.logisticRobotCandidates.push(logisticRobot);
        };
        this.handleHolderAgentAnnouncementResponse = (_time, _addNewEvent, holderAnnoucementReply) => {
            var _a;
            if (!(holderAnnoucementReply instanceof HolderAnnoucementReply))
                return;
            const holder = this.getHolders().filter(holder => holder.id == holderAnnoucementReply.id)[0];
            if (!holder)
                return;
            for (const [input, isAvailable] of holderAnnoucementReply.availableInputs) {
                if (!isAvailable)
                    continue;
                const inputType = input.type;
                if (this.holdersCandidates.has(input.type)) {
                    (_a = this.holdersCandidates.get(input.type)) === null || _a === void 0 ? void 0 : _a.push(holder);
                }
                else {
                    this.holdersCandidates.set(input.type, [holder]);
                }
            }
        };
        this.plan = (time, addNewEvent) => {
            var _a, _b;
            console.log('plan', this.id, time);
            const retry = () => {
                addNewEvent({ time: time + getRandomNumber(this.processRandomParam.planRetryDelay), eventHandler: this.gatherInfo });
            };
            const possibleProductionAgents = ((_a = this.currentPlan) === null || _a === void 0 ? void 0 : _a.productionRobot) ? [(_b = this.currentPlan) === null || _b === void 0 ? void 0 : _b.productionRobot] : this.productionRobotCandidates;
            const logisticRobots = this.logisticRobotCandidates;
            if (logisticRobots.length == 0 || possibleProductionAgents.length === 0) {
                retry();
                return;
            }
            this.currentInputs = this.currentInputs.filter(input => input.quantity > 0);
            if (logisticRobots.length < this.currentInputs.length) {
                this.currentInputs = getRandom(this.currentInputs, logisticRobots.length);
            }
            const filteredInputCandidates = this.currentInputs
                .map(input => {
                var _a;
                const filteredHolders = (_a = this.holdersCandidates.get(input.type)) !== null && _a !== void 0 ? _a : [];
                return { input, filteredHolders };
            })
                .reduce((map, pair) => {
                const input = pair.input;
                const holders = pair.filteredHolders;
                map.set(input, holders);
                return map;
            }, new Map());
            const problems = [...filteredInputCandidates.entries()].filter(([_, ar]) => ar.length === 0);
            if (problems.length !== 0) {
                const childProcesses = problems
                    .map(([item, _]) => item)
                    .filter(item => isDetailType(item.type))
                    .map(item => this.createNewProcesses(item, this, time));
                this.isAwaitingPlanning = true;
                if (childProcesses.length === 0) {
                    retry();
                    return;
                }
                this.childProcessesCount = childProcesses.length;
                addNewEvent({ time: time + getRandomNumber(this.internalEventDelay), eventHandler: this.unreserveResources });
                return;
            }
            const bestCandidates = possibleProductionAgents.map(productionRobot => {
                return {
                    commands: [...filteredInputCandidates.entries()]
                        .map(([input, holders]) => {
                        return {
                            input,
                            holder: holders.reduce((holder, nHolder) => {
                                if (!holder)
                                    return nHolder;
                                return chooseClosest(holder, nHolder, productionRobot);
                            })
                        };
                    }),
                    productionRobot
                };
            });
            const resultingBest = bestCandidates.map(arr => {
                const nLogisticRobots = new Set(logisticRobots);
                if (nLogisticRobots.size === 0)
                    return null;
                const res = {
                    commands: arr.commands.map(item => {
                        if (nLogisticRobots.size === 0)
                            return null;
                        let curCandidates = [...nLogisticRobots.values()];
                        const robot = curCandidates.reduce((robot, nrobot) => {
                            if (!robot)
                                return nrobot;
                            return chooseClosest(robot, nrobot, item.holder);
                        });
                        nLogisticRobots.delete(robot);
                        curCandidates = [];
                        return Object.assign(Object.assign({}, item), { logistic: robot });
                    }).filter(command => command != null),
                    productionRobot: arr.productionRobot
                };
                nLogisticRobots.clear();
                return res;
            })
                .sort((a, b) => {
                if (!a)
                    return -1;
                if (!b)
                    return 1;
                const distA = a.commands.reduce((val, item) => item ? val + Dist(item.holder, item.logistic) : 0, 0);
                const distB = b.commands.reduce((val, item) => item ? val + Dist(item.holder, item.logistic) : 0, 0);
                return a.commands.length === b.commands.length ? distA - distB : b.commands.length - a.commands.length;
            })[0];
            if (resultingBest == null) {
                retry();
                return;
            }
            const prodRobot = resultingBest.productionRobot;
            const commands = resultingBest.commands
                .filter(obj => !!obj)
                .map(obj => {
                if (!obj)
                    throw Error();
                return new Command(obj.holder, prodRobot.reservedInput, obj.logistic, obj.input);
            });
            this.currentPlan = new Plan(commands, resultingBest.productionRobot);
            commands.forEach(command => {
                if ((command.source instanceof Point) || !command.input)
                    throw new Error();
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: command.source.handleReserveResource,
                    object: new HolderReserveQuery(command.input.type, command.input.quantity * this.processCount, this, command.id)
                });
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: command.logistic.handlerReserve,
                    object: new LogisticRobotReserveQuery(command.id, this)
                });
            });
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.currentPlan.productionRobot.handleReserve,
                object: this
            });
            this.isAwaitingPlanning = false;
            addNewEvent({
                time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay),
                eventHandler: this.planInputDelivery
            });
        };
        this.handleReserveResourceResponse = (_time, _addNewEvent, response) => {
            var _a, _b;
            if (!(response instanceof HolderReserveResponse) || !((_a = this.currentPlan) === null || _a === void 0 ? void 0 : _a.commands))
                return;
            const command = (_b = this.currentPlan) === null || _b === void 0 ? void 0 : _b.commands.filter((com) => com.id == response.commandId)[0];
            if (!response.result || !command) {
                return;
            }
            command.setResource(response.result);
        };
        this.handleReserveLogisticResponse = (_time, _addNewEvent, response) => {
            var _a, _b, _c;
            if (!(response instanceof LogisticRobotReserveReply) || !((_a = this.currentPlan) === null || _a === void 0 ? void 0 : _a.commands))
                return;
            const command = (_b = this.currentPlan) === null || _b === void 0 ? void 0 : _b.commands.filter((com) => com.id == response.commandId)[0];
            if (!response.success) {
                return;
            }
            if (!command && ((_c = this.finalDeliveryCommand) === null || _c === void 0 ? void 0 : _c.id) === response.commandId) {
                this.finalDeliveryCommand.setLogisticLocked();
                return;
            }
            if (!command)
                return;
            command.setLogisticLocked();
        };
        this.handleReserveProductionResponse = (_time, _addNewEvent, response) => {
            if (!(response instanceof ProductionRobotReserveResult))
                return;
            if (!response.success || !this.currentPlan || this.currentPlan.productionRobot.id != response.id) {
                return;
            }
            this.currentPlan.productionRobotIsReserved = true;
        };
        this.planInputDelivery = (time, addNewEvent) => {
            var _a;
            if (!this.currentPlan || ((_a = this.currentPlan.commands) === null || _a === void 0 ? void 0 : _a.every((com) => !com.logisticLocked || !com.resource))) {
                this.unreserveResources(time, addNewEvent);
                addNewEvent({
                    time: time + getRandomNumber(this.processRandomParam.planRetryDelay),
                    eventHandler: this.gatherInfo
                });
                this.currentPlan = undefined;
                return;
            }
            const succesfullyLockedCommands = [], unlockCommands = [];
            this.currentPlan.commands
                .forEach((command) => {
                if (command.logisticLocked && command.resource) {
                    return succesfullyLockedCommands.push(command);
                }
                else {
                    return unlockCommands.push(command);
                }
            });
            succesfullyLockedCommands
                .forEach(command => {
                if (!command.resource)
                    throw new Error();
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: command.logistic.handleQueueMove,
                    object: new LogisticRobotMoveQuery(command, this.logisticToManufactureDone)
                });
            });
            console.log('succesfullyLockedCommands', succesfullyLockedCommands.length, this.id, time);
            unlockCommands.forEach(command => {
                this.unreserveCommand(command, time, addNewEvent);
            });
        };
        this.logisticToManufactureDone = (time, addNewEvent, result) => {
            var _a;
            if (!(result instanceof LogisticRobotMoveResult))
                return;
            const lCommand = (_a = this.currentPlan) === null || _a === void 0 ? void 0 : _a.commands.filter(com => com.id == result.commandId)[0];
            if (lCommand)
                lCommand.done = true;
            this.checkManufacture(time + getRandomNumber(this.internalEventDelay), addNewEvent);
        };
        this.checkManufacture = (time, addNewEvent) => {
            console.log('checkManufacture', this.id, time);
            if (!this.currentPlan)
                return;
            const ready = this.currentPlan.commands.every(com => com.done);
            if (!ready)
                return;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.currentPlan.productionRobot.handleCurrentResourceStatus,
                object: new ReservedStatusQuery(this.receiveCurResStatus)
            });
        };
        this.receiveCurResStatus = (time, addNewEvent, status) => {
            console.log('receiveCurResStatus', this.id, time);
            if (!(status instanceof ReservedStatus))
                return;
            this.currentInputs = this.calcExpectedInputs()
                .map((item) => {
                var _a;
                return {
                    type: item.type,
                    quantity: Math.max(0, (item.quantity - ((_a = status.resources.get(item.type.id)) !== null && _a !== void 0 ? _a : 0)))
                };
            });
            if (!this.currentPlan)
                return;
            if (this.currentInputs.every(input => input.quantity <= 0)) {
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: this.currentPlan.productionRobot.manufacture,
                    object: new StartManufactureQuery(this, this.manufactureDone)
                });
                return;
            }
            addNewEvent({
                time: time + getRandomNumber(this.internalEventDelay),
                eventHandler: this.gatherInfo
            });
        };
        this.manufactureDone = (time, addNewEvent, result) => {
            if (!(result instanceof ManifactureResult))
                return;
            console.log('manifactureDone', this.id, time);
            this.result = result.detail;
            addNewEvent({
                time: time + getRandomNumber(this.internalEventDelay),
                eventHandler: this.delivery
            });
        };
        this.unreserveResources = (time, addNewEvent) => {
            var _a;
            if (!((_a = this.currentPlan) === null || _a === void 0 ? void 0 : _a.commands))
                return;
            this.currentPlan.commands.forEach((command) => {
                this.unreserveCommand(command, time, addNewEvent);
            });
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.currentPlan.productionRobot.handleUnreserve
            });
        };
        this.delivery = (time, addNewEvent) => {
            console.log('delivery', this.id, time);
            if (!this.result) {
                throw new Error('Unexpected no result');
            }
            this.logisticRobotCandidates = [];
            this.getLogisticRobots()
                .map(logis => addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: this,
                eventHandler: logis.handleProcessAnnouncement
            }));
            addNewEvent({ time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay), eventHandler: this.tryDelivery });
        };
        this.tryDelivery = (time, addNewEvent) => {
            console.log('tryDelivery', this.id, time);
            if (!this.result)
                throw new Error();
            if (this.logisticRobotCandidates.length === 0) {
                addNewEvent({
                    time: time + getRandomNumber(this.processRandomParam.planRetryDelay),
                    eventHandler: this.delivery
                });
                return;
            }
            const target = isOrder(this.source) ? this.getCustomer() : getRandom(this.getHolders())[0];
            const robot = this.logisticRobotCandidates.sort((a, b) => {
                const distA = Dist(a, target);
                const distB = Dist(b, target);
                return distA - distB;
            })[0];
            this.finalDeliveryCommand = new Command(this.result.position, target, robot);
            this.finalDeliveryCommand.setResource(this.result);
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: robot.handlerReserve,
                object: new LogisticRobotReserveQuery(this.finalDeliveryCommand.id, this)
            });
            addNewEvent({
                time: time + getRandomNumber(this.processRandomParam.responseTimeoutDelay),
                eventHandler: this.logisticToResult
            });
        };
        this.logisticToResult = (time, addNewEvent) => {
            console.log('logisticToResult', this.id, time);
            if (!this.finalDeliveryCommand || !this.finalDeliveryCommand.logisticLocked) {
                if (this.finalDeliveryCommand) {
                    addNewEvent({
                        time: time + getRandomNumber(this.communicationDelay),
                        eventHandler: this.finalDeliveryCommand.logistic.handleUnreserve
                    });
                }
                this.finalDeliveryCommand = undefined;
                addNewEvent({
                    time: time + getRandomNumber(this.processRandomParam.planRetryDelay),
                    eventHandler: this.delivery
                });
                return;
            }
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: this.finalDeliveryCommand.logistic.handleQueueMove,
                object: new LogisticRobotMoveQuery(this.finalDeliveryCommand, this.logisticToResultDone)
            });
        };
        this.logisticToResultDone = (time, addNewEvent, result) => {
            console.log('logisticToResultDone', this.id, time);
            if (!(result instanceof LogisticRobotMoveResult))
                return;
            this.isCompleted = true;
            if (isOrder(this.source)) {
                this.isCompleted = true;
                this.source.done();
            }
            else {
                addNewEvent({
                    time: time + getRandomNumber(this.communicationDelay),
                    eventHandler: this.source.handleChildProcessDone
                });
            }
        };
        this.handleChildProcessDone = (time, addNewEvent) => {
            --this.childProcessesCount;
            if (this.childProcessesCount <= 0) {
                addNewEvent({
                    time: time + getRandomNumber(this.internalEventDelay),
                    eventHandler: this.gatherInfo
                });
            }
        };
        this.type = type;
        this.requestedQuantity = quantity;
        this.id = `ManufacturingProcess-${++idx}`;
        this.source = source;
        this.processCount = Math.ceil(this.requestedQuantity / this.type.output.quantity);
        this.currentInputs = this.calcExpectedInputs();
        this.getProductionAgents = GetProductionAgents;
        this.getHolders = () => GetHolders();
        this.getLogisticRobots = GetLogisticRobots;
        this.getCustomer = GetCustomer;
        this.createNewProcesses = createNewProcesses;
        this.isPrimitive = type.input.every(item => isResourceType(item.type));
        this.communicationDelay = communicationDelay;
        this.internalEventDelay = internalEventDelay;
        this.processRandomParam = processRandomParam;
        this.resetState();
    }
    resetState() {
        this.isAwaitingPlanning = true;
        this.isAwaitingPalningResultDelivery = false;
        this.isAwaitingResultDelivery = false;
        this.isDeliveredToRobot = false;
        this.isCompleted = false;
    }
    countDeficit(resources) {
        const res = this.type.input
            .map(input => {
            const totalCount = resources.get(input.type.id);
            return {
                totalCount,
                input
            };
        })
            .map(item => {
            var _a;
            return {
                type: item.input.type,
                quantity: item.input.quantity * this.processCount - ((_a = item.totalCount) !== null && _a !== void 0 ? _a : 0)
            };
        })
            .filter(item => item.quantity > 0);
        return res;
    }
    unreserveCommand(command, time, addNewEvent) {
        if (command.done)
            return;
        if (command.resource && !(command.source instanceof Point)) {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: command.source.handleUnreserveResource,
                object: new HolderUnreserveQuery(command.resource, this)
            });
        }
        if (command.logisticLocked) {
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: command.logistic.handleUnreserve
            });
        }
    }
}
export function isProcess(object) {
    var _a, _b;
    return (_b = (_a = object === null || object === void 0 ? void 0 : object.id) === null || _a === void 0 ? void 0 : _a.startsWith) === null || _b === void 0 ? void 0 : _b.call(_a, 'ManufacturingProcess');
}
