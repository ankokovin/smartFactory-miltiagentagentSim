import ProductType from "../data/types/ProductType.js";
import ProcessType from "../data/types/ProcessType.js";
import { isResourceType } from "../data/types/ResourceType.js";
import { randomNumber, randomInt, getRandom } from "../utils.js";
import { isDetailType } from "../data/types/DetailType.js";
let idx = 0;
export default class Designer {
    constructor(getNewOrders, getResourceTypes, createProcessType, getProcessTypes, createProcess, createCapability, getProductionRobotTypes) {
        this.id = `Designer-${idx}`;
        this.getNewOrders = getNewOrders;
        this.types = new Map();
        this.getResourceTypes = getResourceTypes;
        this.createProcessType = createProcessType;
        this.getProcessTypes = getProcessTypes;
        this.createProcess = createProcess;
        this.createCapability = createCapability;
        this.getProductionRobotTypes = getProductionRobotTypes;
    }
    getPrimitiveResources() {
        return this.getResourceTypes().filter(type => isResourceType(type));
    }
    createPrimitiveProcess(detailType, description) {
        let inputTypes = getRandom(this.getPrimitiveResources(), randomInt(1, 4));
        return new ProcessType(inputTypes.map(type => {
            return {
                quantity: randomNumber(1, 10),
                type: type
            };
        }), {
            quantity: randomNumber(1, 10),
            type: detailType
        });
    }
    createNewProductType(description) {
        let productType = new ProductType(`ProductType-${++idx}`);
        let processType;
        if (Math.random() > 0.5) {
            processType = this.createPrimitiveProcess(productType, description);
        }
        else {
            let inputTypes = getRandom(this.getResourceTypes(), randomInt(1, 4));
            processType = new ProcessType(inputTypes.map(type => {
                return {
                    quantity: randomNumber(1, 10),
                    type: type
                };
            }), {
                quantity: randomNumber(1, 10),
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
    run() {
        const orders = this.getNewOrders();
        orders.forEach(order => {
            let productType;
            let processType;
            if (order.productId) {
                if (this.types.has(order.productId)) {
                    productType = this.types.get(order.productId);
                }
                else {
                    if (!order.description) {
                        return;
                    }
                    [productType, processType] = this.createNewProductType(order.description);
                }
            }
            else {
                if (order.description) {
                    [productType, processType] = this.createNewProductType(order.description);
                }
                else {
                    throw new Error("got an order without neither productid nor description");
                }
            }
            order.setProductType(productType);
            if (productType) {
                if (!processType) {
                    processType = this.getProcessTypes().find(type => type.output.type == productType);
                    if (!processType) {
                        throw new Error("failed to get process");
                    }
                }
                this.createProcess({ quantity: order.quantity, type: processType, source: order });
            }
        });
    }
}
