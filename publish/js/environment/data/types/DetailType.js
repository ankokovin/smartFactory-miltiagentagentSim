export default class DetailType {
    constructor(id, isNotDetail) {
        this.id = id;
        this.isDetail = !isNotDetail;
    }
}
export function isDetailType(object) {
    return object && object.isDetail;
}
