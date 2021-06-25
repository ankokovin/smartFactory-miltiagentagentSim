import ProductType from "./types/ProductType";

export default class Order {
    type: string = 'order'
    productId?: string
    description?: string
    productType?: ProductType = undefined 
    quantity: number
    isDone: boolean = false

    constructor(
        quantity: number,
        productId?: string,
        description?: string) {
            this.productId = productId;
            this.description = description;
            this.quantity = quantity;
    }

    setProductType(productType?: ProductType) {
        this.productType = productType;
    }
}

export function isOrder(object: any): object is Order {
    return object && 'type' in object && object.type === 'order'
}