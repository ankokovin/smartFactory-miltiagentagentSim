import { isProductType } from "./ProductType.js";
import { isDetailType } from "./DetailType.js";
export function isResourceType(object) {
    return object && !isProductType(object) && !isDetailType(object);
}
