import { Time } from "./AgentEvent";
import ProductModel from "./ProductModel";
import ProductType from "./types/ProductType";

export default class Order {
    type = 'order'
    currentProductModel: ProductModel
    productId?: string
    productType?: ProductType = undefined 
    quantity: number
    isDone = false
    timeCreated: Time

    constructor(
        quantity: number,
        currentProductModel: ProductModel,
        timeCreated: Time,
        productId?: string) {
            this.productId = productId;
            this.quantity = quantity;
            this.currentProductModel = currentProductModel;
            this.timeCreated = timeCreated;
        }

    setProductType(productType?: ProductType) {
        this.productType = productType;
    }

    done() {
        this.isDone = true
    }
}

export function isOrder(object: any): object is Order {
    return object && 'type' in object && object.type === 'order'
}