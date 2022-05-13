import { isProductType } from "./ProductType";
import { isDetailType } from "./DetailType";

export type ResourceTypeId = string

export default interface ResourceType {
    id: ResourceTypeId
}

export function isResourceType(object: ResourceType): object is ResourceType {
    return object && !isProductType(object) && !isDetailType(object)
}