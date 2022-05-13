export class Plan {
    constructor(commands, productionRobot) {
        this.commands = commands;
        this.productionRobot = productionRobot;
        this.productionRobotIsReserved = false;
    }
}
