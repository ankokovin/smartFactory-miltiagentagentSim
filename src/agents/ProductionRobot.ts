import Detail from "../data/material/Detail";
import Product from "../data/material/Product";
import Resource from "../data/material/Resource";
import Point from "../data/Point";
import Capability from "../data/process/Capability";
import { isDetailType } from "../data/types/DetailType";
import ProductionRobotType from "../data/types/ProductionRobotType";
import { isProductType } from "../data/types/ProductType";
import ResourceType from "../data/types/ResourceType";
import IAgent from "../interfaces/IAgent";
import ILocatable from "../interfaces/ILocatable";
import { randomInt } from "../utils";
import Holder from "./Holder";
import Process from "./Process";

let idx = 0;

type getCapabilities = (a: ProductionRobot) => Capability[]

export default class ProductionRobot extends Holder implements IAgent, ILocatable {
    constructor(type: ProductionRobotType, getCapabilities: getCapabilities, position? : Point) {
        super();
        this.id = `ProductionRobot-${++idx}`
        this.type = type
        this.position = position ?? {x: randomInt(0, 1000), y: randomInt(0, 1000)}
        this.getCapabilities = () => getCapabilities(this)
        this.isBusy = false
        this.reserved = new Holder(this.position)
    }
    id: string;
    run() {

    }
    position: Point;
    type: ProductionRobotType;
    isBusy: boolean;    

    getCapabilities : () => Capability[]

    announceWork(process: Process): boolean {
        return !this.isBusy && this.getCapabilities().some(c => c.processType === process.type)
    }

    reserved : Holder 

    manufacture(process: Process): Detail | null {
        let count = process.processCount
        process.type.input.map(({type, quantity}) => { return {type, quantity: quantity * count} })
            .forEach(input => {
                let val = this.reserved.resources.get(input.type.id)
                if (!val || val < input.quantity) {
                    throw new Error()
                }
                this.reserved.updateResource(input.type.id, val - input.quantity)
        })
        let outputType = process.type.output.type
        let outputQuantity = process.type.output.quantity * count

        let result: Detail | null = null
        if (isDetailType(outputType)) {
            result = new Detail(this.position, outputType, outputQuantity)
        } else if (isProductType(outputType)) {
            result = new Product(this.position, outputType, outputQuantity)
        }
        if (result != null) {
            this.addResource(result)
        }
        this.isBusy = false
        return result
    }
}

export function isProductionRobot(object: any) : object is ProductionRobot {
    return object?.id?.startsWith('ProductionRobot')
}