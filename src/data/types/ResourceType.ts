import { isProductType } from "./ProductType";
import { isDetailType } from "./DetailType";

export default interface ResourceType {
    id: string
}

export function isResourceType(object: ResourceType): object is ResourceType {
    return object && !isProductType(object) && !isDetailType(object)
}