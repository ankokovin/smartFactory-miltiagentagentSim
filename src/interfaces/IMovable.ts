import Point from "../data/Point";
import ILocatable from "./ILocatable";

export default interface IMoveable extends ILocatable {
    updatePosition(newPosition: Point): void
}