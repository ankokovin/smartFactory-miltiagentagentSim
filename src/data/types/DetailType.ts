import ResourceType from "./ResourceType";

export default class DetailType implements ResourceType {
    id: string;
    isDetail: boolean;
    constructor(id: string, isNotDetail?: boolean) {
        this.id = id;
        this.isDetail = !isNotDetail;
    }
}

export function isDetailType(object: any): object is DetailType {
    return object && object.isDetail
}