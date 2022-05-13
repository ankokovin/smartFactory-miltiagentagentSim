import { EventHandler, Time } from "../data/AgentEvent"
import ProcessMakerRandomParams from "../data/environmentSettings/ProcessMakerRandomParams"
import Order from "../data/Order"
import Capability from "../data/process/Capability"
import ProcessData from "../data/process/ProcessData"
import { getRandomNumber } from "../data/RandomInterval"
import DetailType, { isDetailType } from "../data/types/DetailType"
import ProcessType from "../data/types/ProcessType"
import ProductionRobotType from "../data/types/ProductionRobotType"
import ProductType from "../data/types/ProductType"
import ResourceType, { isResourceType } from "../data/types/ResourceType"
import IAgent from "../interfaces/IAgent"
import { getRandom } from "../utils"

export type getResourceTypes = () => ResourceType[] 
export type createProcessType = (a: ProcessType) => void
export type getProcessTypes = () => ProcessType[]
export type createProcess = (a: ProcessData, t:Time) => void
export type createCapability = (a: Capability) => void
export type getProductionRobotTypes = () => ProductionRobotType[]

const types: Map<string, ProductType> = new Map()
let idx = 0;

export class ProcessMaker implements IAgent {

    private getResourceTypes: getResourceTypes
    private createProcessType: createProcessType
    private getProcessTypes: getProcessTypes
    private createProcess: createProcess
    private createCapability: createCapability

    getProductionRobotTypes: getProductionRobotTypes
    private processMakerRandomParams: ProcessMakerRandomParams
    constructor(
        getResourceTypes: getResourceTypes, 
        createProcessType: createProcessType,
        getProcessTypes: getProcessTypes,
        createProcess:createProcess,
        createCapability: createCapability,
        getProductionRobotTypes: getProductionRobotTypes,  
        ProcessMakerRandomParams: ProcessMakerRandomParams){
        this.getResourceTypes = getResourceTypes
        this.createProcessType = createProcessType
        this.getProcessTypes = getProcessTypes
        this.createProcess = createProcess
        this.createCapability = createCapability
        this.getProductionRobotTypes = getProductionRobotTypes
        this.processMakerRandomParams = ProcessMakerRandomParams
        this.id = 'ProcessMaker'
        }
    id: string

    private createNewProductType(): [ProductType, ProcessType] {
        const productType = new ProductType(`ProductType-${++idx}`)
        let processType : ProcessType
        if (Math.random() <= this.processMakerRandomParams.primitiveProbability) {
            processType = this.createPrimitiveProcess(productType)
        } else {
            const inputTypes = getRandom(this.getResourceTypes(), getRandomNumber(this.processMakerRandomParams.inputCount))
            processType = new ProcessType(inputTypes.map(type => {
                return {
                    quantity: getRandomNumber(this.processMakerRandomParams.inputQuantity),
                    type: type
                }
            }), {
                quantity: getRandomNumber(this.processMakerRandomParams.outputQuantity),
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

    private createCapabilities(processType: ProcessType) {
        getRandom(this.getProductionRobotTypes())
        .map(type => {
            return {
                productionRobotType: type,
                processType
            }})
        .forEach(capability => this.createCapability(capability))
    }

    private getPrimitiveResources() : ResourceType[] {
        return this.getResourceTypes().filter(type => isResourceType(type))
    }

    public createPrimitiveProcess(detailType: DetailType) : ProcessType {
        const inputTypes = getRandom(this.getPrimitiveResources(), getRandomNumber(this.processMakerRandomParams.inputCount))
        return new ProcessType(inputTypes.map(type => {
            return {
                quantity: getRandomNumber(this.processMakerRandomParams.inputQuantity),
                type: type
            }
        }), {
            quantity: getRandomNumber(this.processMakerRandomParams.outputQuantity),
            type: detailType
        })
    }

    private createNewProcess(order: Order, time: Time) {
        let productType : ProductType | undefined
        let processType : ProcessType | undefined
        if (order.productId) {
            if (types.has(order.productId)) {
                productType = types.get(order.productId)
            } else {
                [productType, processType] = this.createNewProductType()
            }
        } else {
            [productType, processType] = this.createNewProductType()
        }
        order.setProductType(productType)
        if (productType) {
            if (!processType) {
                processType = this.getProcessTypes().find(type => type.output.type == productType)
                if (!processType) {
                    throw new Error("failed to get process")
                }
            }
            this.createProcess({quantity: order.quantity, type: processType, source: order}, time);
        }
    }


    handleNewProcess: EventHandler  = (currentTime, _addNewEventHandler, order?) => {
        if (!(order instanceof Order)) return
        this.createNewProcess(order, currentTime)
    }
}