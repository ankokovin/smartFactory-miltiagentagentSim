import { chooseClosest, Dist } from "../interfaces/ILocatable.js";
import { isResourceType } from "../data/types/ResourceType.js";
import { isOrder } from "../data/Order.js";
import { getRandom } from "../utils.js";
import { isDetailType } from "../data/types/DetailType.js";
var idx = 0;
export default class Process {
    constructor(quantity, type, source, AnnounceToProductionAgents, AnnounceToHolders, AnnounceToLogisticRobots, GetCustomer, createNewProcesses, GetCleanHolders) {
        this.isProcess = true;
        this.logisticCounter = -1;
        this.childProcessesCount = -1;
        this.type = type;
        this.requestedQuantity = quantity;
        this.id = `ManufacturingProcess-${++idx}`;
        this.isAwaitingPlanning = true;
        this.isAwaitingPalningResultDelivery = false;
        this.isAwaitingResultDelivery = false;
        this.isDeliveredToRobot = false;
        this.isCompleted = false;
        this.source = source;
        this.processCount = Math.ceil(this.requestedQuantity / this.type.output.quantity);
        this.currentInputs = type.input.map(input => { return { type: input.type, quantity: input.quantity * this.processCount }; });
        this.announceToProductionAgents = () => AnnounceToProductionAgents(this);
        this.announceToHolders = () => AnnounceToHolders();
        this.announceToLogisticRobots = () => AnnounceToLogisticRobots();
        this.getCustomer = GetCustomer;
        this.createNewProcesses = createNewProcesses;
        this.isPrimitive = type.input.every(item => isResourceType(item.type));
        this.GetCleanHolders = GetCleanHolders;
    }
    run(turn) {
        if (this.isCompleted)
            return;
        if (this.childProcessesCount > 0)
            return;
        if (this.selectedProductionRobot && this.isDeliveredToRobot) {
            const deficit = this.countDeficit(this.selectedProductionRobot.reserved.resources);
            if (deficit.length === 0) {
                console.log(`${this.id} ready!`);
                let result = this.selectedProductionRobot.manufacture(this);
                if (result == null) {
                    throw new Error("Unexpected no result for manufacture process");
                }
                this.result = result;
                this.isAwaitingPalningResultDelivery = true;
            }
            else {
                this.currentInputs = deficit;
                this.isAwaitingPlanning = true;
            }
            this.isDeliveredToRobot = false;
        }
        if (this.isAwaitingPlanning) {
            //if (this.isPrimitive) {
            this.plan();
        }
        if (this.isAwaitingPalningResultDelivery) {
            this.delivery();
        }
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
    plan() {
        let possibleProductionAgents = this.selectedProductionRobot ? [this.selectedProductionRobot] : this.announceToProductionAgents();
        if (possibleProductionAgents.length === 0)
            return;
        let logisticRobots = this.announceToLogisticRobots();
        if (logisticRobots.length === 0)
            return;
        if (logisticRobots.length < this.currentInputs.length) {
            this.currentInputs = getRandom(this.currentInputs, logisticRobots.length);
        }
        let holders = this.announceToHolders();
        let filteredInputCandidates = this.currentInputs
            .map(input => {
            let filteredHolders = holders.filter(holder => holder.announce(input));
            return { input, filteredHolders };
        })
            .reduce((map, pair) => {
            const input = pair.input;
            const holders = pair.filteredHolders;
            map.set(input, holders);
            return map;
        }, new Map());
        let problems = [...filteredInputCandidates.entries()].filter(([_, ar]) => ar.length === 0);
        if (problems.length !== 0) {
            console.log("not enough resources");
            let childProcesses = problems
                .map(([item, _]) => item)
                .filter(item => isDetailType(item.type))
                .map(item => this.createNewProcesses(item, this));
            this.childProcessesCount = childProcesses.length;
            if (this.selectedProductionRobot) {
                this.selectedProductionRobot.isBusy = false;
                this.selectedProductionRobot = undefined;
            }
            this.isAwaitingPlanning = true;
            return;
        }
        console.log("enought resources: ", this.id);
        let bestCandidates = possibleProductionAgents.map(productionRobot => {
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
        let resultingBest = bestCandidates.map(arr => {
            const nLogisticRobots = new Set(logisticRobots);
            return {
                commands: arr.commands.map(item => {
                    const robot = [...nLogisticRobots.values()].reduce((robot, nrobot) => {
                        if (!robot)
                            return nrobot;
                        return chooseClosest(robot, nrobot, item.holder);
                    });
                    nLogisticRobots.delete(robot);
                    return Object.assign(Object.assign({}, item), { logistic: robot });
                }),
                productionRobot: arr.productionRobot
            };
        }).sort((a, b) => {
            let distA = a.commands.reduce((val, item) => val + Dist(item.holder, item.logistic), 0);
            let distB = b.commands.reduce((val, item) => val + Dist(item.holder, item.logistic), 0);
            return distA - distB;
        })[0];
        resultingBest.commands.forEach(command => {
            const res = command.holder.getResource(command.input.type, command.input.quantity * this.processCount);
            if (!res) {
                throw new Error('no res? why?');
            }
            res.isReserved = true;
            this.isDeliveredToRobot = false;
            command.logistic.pickupResource(res, resultingBest.productionRobot.reserved, () => {
                this.logisticCounter -= 1;
                if (this.logisticCounter <= 0) {
                    this.isDeliveredToRobot = true;
                }
            });
        });
        this.selectedProductionRobot = resultingBest.productionRobot;
        this.selectedProductionRobot.isBusy = true;
        this.isAwaitingPlanning = false;
    }
    delivery() {
        if (isOrder(this.source)) {
            if (!this.result) {
                throw new Error('Unexpected no result');
            }
            let logisticRobots = this.announceToLogisticRobots();
            if (logisticRobots.length === 0) {
                console.log("Not enougth logistic robots");
                return;
            }
            const customer = this.getCustomer();
            let robot = logisticRobots.sort((a, b) => {
                let distA = Dist(a, customer);
                let distB = Dist(b, customer);
                return distA - distB;
            })[0];
            robot.pickupResource(this.result, customer, () => {
                if (isOrder(this.source)) {
                    if (!this.result) {
                        throw new Error('Unexpected no result');
                    }
                    this.isCompleted = true;
                    this.source.isDone = true;
                    console.log(`${this.id} completed!`);
                }
            });
            this.isAwaitingPalningResultDelivery = false;
            this.isAwaitingResultDelivery = true;
            console.log(`Final delivery started ${this.id}`);
            return;
        }
        if (isProcess(this.source)) {
            if (!this.result) {
                throw new Error('Unexpected no result');
            }
            let logisticRobots = this.announceToLogisticRobots();
            if (logisticRobots.length === 0) {
                console.log("Not enougth logistic robots");
                return;
            }
            const holder = getRandom(this.GetCleanHolders(), 1)[0];
            let robot = logisticRobots.sort((a, b) => {
                let distA = Dist(a, holder);
                let distB = Dist(b, holder);
                return distA - distB;
            })[0];
            robot.pickupResource(this.result, holder, () => {
                this.isCompleted = true;
                if (isProcess(this.source))
                    --this.source.childProcessesCount;
                console.log(`${this.id} completed!`);
            });
            this.isAwaitingPalningResultDelivery = false;
            this.isAwaitingResultDelivery = true;
            console.log(`Final delivery started ${this.id}`);
            return;
        }
        throw new Error("Unknown source");
    }
}
export function isProcess(object) {
    var _a, _b;
    return (_b = (_a = object === null || object === void 0 ? void 0 : object.id) === null || _a === void 0 ? void 0 : _a.startsWith) === null || _b === void 0 ? void 0 : _b.call(_a, 'ManufacturingProcess');
}
