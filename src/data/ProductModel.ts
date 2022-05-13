import ProductModelEnum from "./ProductModelEnum";

export const ProductModelCreationMap : any = {} 
export function ProductModelCreationMapReset() {
    ProductModelCreationMap[ProductModelEnum.CAD.toString()] = 0
    ProductModelCreationMap[ProductModelEnum.Image.toString()] = 0
    ProductModelCreationMap[ProductModelEnum.Text.toString()] = 0
}
export default class ProductModel {
    type: ProductModelEnum
    constructor(type: ProductModelEnum) {
        this.type = type;
        ProductModelCreationMap[type.toString()] = ProductModelCreationMap[type.toString()] + 1;
    }
}

