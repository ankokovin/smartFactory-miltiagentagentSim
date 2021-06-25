import Point from "../Point";
import DetailType from "../types/DetailType";
import Resource from "./Resource";

export default class Detail extends Resource {

    constructor(position: Point, type: DetailType, quantity: number) {
        super(position, type, quantity);
    }
}