import ProductModelEnum from "./ProductModelEnum.js";
export const ProductModelCreationMap = {};
export function ProductModelCreationMapReset() {
    ProductModelCreationMap[ProductModelEnum.CAD.toString()] = 0;
    ProductModelCreationMap[ProductModelEnum.Image.toString()] = 0;
    ProductModelCreationMap[ProductModelEnum.Text.toString()] = 0;
}
export default class ProductModel {
    constructor(type) {
        this.type = type;
        ProductModelCreationMap[type.toString()] = ProductModelCreationMap[type.toString()] + 1;
    }
}
