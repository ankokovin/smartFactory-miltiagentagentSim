import IAgent from "../interfaces/IAgent";
import Order from "../data/Order";
import ProductType, { isProductType } from "../data/types/ProductType";
import ProcessType from "../data/types/ProcessType";
import ResourceType, { isResourceType } from "../data/types/ResourceType";
import { randomNumber, randomInt, getRandom } from "../utils";
import ProcessData from "../data/process/ProcessData";
import Capability from "../data/process/Capability";
import ProductionRobotType from "../data/types/ProductionRobotType";
import DetailType, { isDetailType } from "../data/types/DetailType";

let idx = 0;

export type getNewOrders = () => Order[]

export type getResourceTypes = () => ResourceType[] 

export type createProcessType = (a: ProcessType) => void
export type getProcessTypes = () => ProcessType[]

export type createProcess = (a: ProcessData) => void

export type createCapability = (a: Capability) => void

export type getProductionRobotTypes = () => ProductionRobotType[]

export default class Designer implements IAgent {

    types: Map<string, ProductType>

    
    constructor(
        getNewOrders: getNewOrders, 
        getResourceTypes: getResourceTypes, 
        createProcessType: createProcessType,
        getProcessTypes: getProcessTypes,
        createProcess:createProcess,
        createCapability: createCapability,
        getProductionRobotTypes: getProductionRobotTypes ) {
        this.id = `Designer-${idx}`
        this.getNewOrders = getNewOrders
        this.types = new Map()
        this.getResourceTypes = getResourceTypes
        this.createProcessType = createProcessType
        this.getProcessTypes = getProcessTypes
        this.createProcess = createProcess
        this.createCapability = createCapability
        this.getProductionRobotTypes = getProductionRobotTypes
    }

    id: string;

    getNewOrders: getNewOrders;

    getResourceTypes: getResourceTypes;

    createProcessType: createProcessType
    getProcessTypes: getProcessTypes

    createProcess:createProcess
    createCapability: createCapability

    getProductionRobotTypes: getProductionRobotTypes

    getPrimitiveResources() : ResourceType[] {
        return this.getResourceTypes().filter(type => isResourceType(type))
    }

    createPrimitiveProcess(detailType: DetailType, description?: String) : ProcessType {
        let inputTypes = getRandom(this.getPrimitiveResources() ,randomInt(1, 4))
        return new ProcessType(inputTypes.map(type => {
            return {
                quantity: randomNumber(1, 10),
                type: type
            }
        }), {
            quantity: randomNumber(1, 10),
            type: detailType
        })
    }

    createNewProductType(description: String): [ProductType, ProcessType] {
        let productType = new ProductType(`ProductType-${++idx}`)
        let processType : ProcessType
        if (Math.random() > 0.5) {
            processType = this.createPrimitiveProcess(productType, description)
        } else {
            let inputTypes = getRandom(this.getResourceTypes() ,randomInt(1, 4))
            processType = new ProcessType(inputTypes.map(type => {
                return {
                    quantity: randomNumber(1, 10),
                    type: type
                }
            }), {
                quantity: randomNumber(1, 10),
                type: productType
            })
            inputTypes
                .filter(type => isDetailType(type) && !this.getProcessTypes().some(item => item.output.type == type))
                .map(type => isDetailType(type) && this.createPrimitiveProcess(type))
                .forEach(processType =>  {
                    if (processType) {
                        this.createCapabilities(processType)
                        this.createProcessType(processType)
                    } 
                })
        }
        this.createProcessType(processType)
        this.createCapabilities(processType)
        return [productType, processType]
    }

    createCapabilities(processType: ProcessType) {
        getRandom(this.getProductionRobotTypes())
        .map(type => {
            return {
                productionRobotType: type,
                processType
            }})
        .forEach(capability => this.createCapability(capability))
    }

    run() {
        const orders = this.getNewOrders()
        orders.forEach(order => {
            let productType : ProductType | undefined
            let processType : ProcessType | undefined
            if (order.productId) {
                if (this.types.has(order.productId)) {
                    productType = this.types.get(order.productId)
                } else {
                    if (!order.description) {
                        return;
                    }
                    [productType, processType] = this.createNewProductType(order.description)
                }
            } else {
                if (order.description) {
                    [productType, processType] = this.createNewProductType(order.description)
                } else {
                    throw new Error("got an order without neither productid nor description")
                }
            }
            order.setProductType(productType)
            if (productType) {
                if (!processType) {
                    processType = this.getProcessTypes().find(type => type.output.type == productType)
                    if (!processType) {
                        throw new Error("failed to get process")
                    }
                }
                this.createProcess({quantity: order.quantity, type: processType, source: order});
            }    
        })
    }
    
}