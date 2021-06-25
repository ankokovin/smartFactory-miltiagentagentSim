import DetailType from "./DetailType";

export default class ProductType extends DetailType {
    id: string;
    isProduct: boolean;

    constructor(id: string) {
        super(id, true);
        this.id = id;
        this.isProduct = true;
    }
}

export function isProductType(object: any): object is ProductType {
    return object && object.isProduct
}