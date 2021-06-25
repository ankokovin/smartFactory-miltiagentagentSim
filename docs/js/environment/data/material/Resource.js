export default class Resource {
    constructor(position, type, quantity) {
        this.position = position;
        this.type = type;
        this.quantity = quantity;
        this.isBeingHeld = false;
        this.isReserved = false;
    }
    updatePosition(newPosition) {
        this.position = newPosition;
    }
}
