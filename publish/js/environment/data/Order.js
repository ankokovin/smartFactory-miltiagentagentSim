export default class Order {
    constructor(quantity, productId, description) {
        this.type = 'order';
        this.productType = undefined;
        this.isDone = false;
        this.productId = productId;
        this.description = description;
        this.quantity = quantity;
    }
    setProductType(productType) {
        this.productType = productType;
    }
}
export function isOrder(object) {
    return object && 'type' in object && object.type === 'order';
}
