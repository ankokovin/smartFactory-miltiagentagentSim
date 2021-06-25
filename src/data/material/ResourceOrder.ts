import ResourceType from "../types/ResourceType";

export default interface ResourceOrder {
    type: ResourceType
    quantity: number
    turn: number
}