import Holder from "./Holder.js";
export class ReservedHolder extends Holder {
    constructor(communicationDelay, position) {
        super(communicationDelay, position);
        this.handleProcessAnnouncementHolder = () => {
            return;
        };
    }
    publicGetResource(r, q) {
        return this.getResource(r, q);
    }
    getAllResources() {
        return this.resources;
    }
}
