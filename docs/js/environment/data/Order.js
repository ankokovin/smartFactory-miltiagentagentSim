export default class Order {
    constructor(quantity, currentProductModel, timeCreated, productId) {
        this.type = 'order';
        this.productType = undefined;
        this.isDone = false;
        this.productId = productId;
        this.quantity = quantity;
        this.currentProductModel = currentProductModel;
        this.timeCreated = timeCreated;
    }
    setProductType(productType) {
        this.productType = productType;
    }
    done() {
        this.isDone = true;
    }
}
export function isOrder(object) {
    return object && 'type' in object && object.type === 'order';
}
