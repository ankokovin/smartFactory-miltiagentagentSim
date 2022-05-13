import Order from "../data/Order.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { isDetailType } from "../data/types/DetailType.js";
import ProcessType from "../data/types/ProcessType.js";
import ProductType from "../data/types/ProductType.js";
import { isResourceType } from "../data/types/ResourceType.js";
import { getRandom } from "../utils.js";
const types = new Map();
let idx = 0;
export class ProcessMaker {
    constructor(getResourceTypes, createProcessType, getProcessTypes, createProcess, createCapability, getProductionRobotTypes, ProcessMakerRandomParams) {
        this.handleNewProcess = (currentTime, _addNewEventHandler, order) => {
            if (!(order instanceof Order))
                return;
            this.createNewProcess(order, currentTime);
        };
        this.getResourceTypes = getResourceTypes;
        this.createProcessType = createProcessType;
        this.getProcessTypes = getProcessTypes;
        this.createProcess = createProcess;
        this.createCapability = createCapability;
        this.getProductionRobotTypes = getProductionRobotTypes;
        this.processMakerRandomParams = ProcessMakerRandomParams;
        this.id = 'ProcessMaker';
    }
    createNewProductType() {
        const productType = new ProductType(`ProductType-${++idx}`);
        let processType;
        if (Math.random() <= this.processMakerRandomParams.primitiveProbability) {
            processType = this.createPrimitiveProcess(productType);
        }
        else {
            const inputTypes = getRandom(this.getResourceTypes(), getRandomNumber(this.processMakerRandomParams.inputCount));
            processType = new ProcessType(inputTypes.map(type => {
                return {
                    quantity: getRandomNumber(this.processMakerRandomParams.inputQuantity),
                    type: type
                };
            }), {
                quantity: getRandomNumber(this.processMakerRandomParams.outputQuantity),
                type: productType
            });
            inputTypes
                .filter(type => isDetailType(type) && !this.getProcessTypes().some(item => item.output.type == type))
                .map(type => isDetailType(type) && this.createPrimitiveProcess(type))
                .forEach(processType => {
                if (processType) {
                    this.createCapabilities(processType);
                    this.createProcessType(processType);
                }
            });
        }
        this.createProcessType(processType);
        this.createCapabilities(processType);
        return [productType, processType];
    }
    createCapabilities(processType) {
        getRandom(this.getProductionRobotTypes())
            .map(type => {
            return {
                productionRobotType: type,
                processType
            };
        })
            .forEach(capability => this.createCapability(capability));
    }
    getPrimitiveResources() {
        return this.getResourceTypes().filter(type => isResourceType(type));
    }
    createPrimitiveProcess(detailType) {
        const inputTypes = getRandom(this.getPrimitiveResources(), getRandomNumber(this.processMakerRandomParams.inputCount));
        return new ProcessType(inputTypes.map(type => {
            return {
                quantity: getRandomNumber(this.processMakerRandomParams.inputQuantity),
                type: type
            };
        }), {
            quantity: getRandomNumber(this.processMakerRandomParams.outputQuantity),
            type: detailType
        });
    }
    createNewProcess(order, time) {
        let productType;
        let processType;
        if (order.productId) {
            if (types.has(order.productId)) {
                productType = types.get(order.productId);
            }
            else {
                [productType, processType] = this.createNewProductType();
            }
        }
        else {
            [productType, processType] = this.createNewProductType();
        }
        order.setProductType(productType);
        if (productType) {
            if (!processType) {
                processType = this.getProcessTypes().find(type => type.output.type == productType);
                if (!processType) {
                    throw new Error("failed to get process");
                }
            }
            this.createProcess({ quantity: order.quantity, type: processType, source: order }, time);
        }
    }
}
