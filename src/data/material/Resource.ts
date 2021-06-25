import IMoveable from "../../interfaces/IMovable";
import Point from "../Point";
import ResourceType from "../types/ResourceType";

export default class Resource implements IMoveable  {
    position: Point
    type: ResourceType
    quantity: number
    isBeingHeld: boolean
    isReserved: boolean

    constructor(position: Point, type: ResourceType, quantity: number) {
        this.position = position;
        this.type = type;
        this.quantity = quantity;
        this.isBeingHeld = false;
        this.isReserved = false;
    }

    updatePosition(newPosition: Point): void {
       this.position = newPosition
    }
}