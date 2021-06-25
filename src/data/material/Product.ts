import Point from "../Point";
import ProductType from "../types/ProductType";
import Resource from "./Resource";

export default class Product extends Resource {

    constructor(position: Point, type: ProductType, quantity: number) {
        super(position, type, quantity);
    }
}