import DetailType from "./DetailType.js";
export default class ProductType extends DetailType {
    constructor(id) {
        super(id, true);
        this.id = id;
        this.isProduct = true;
    }
}
export function isProductType(object) {
    return object && object.isProduct;
}
