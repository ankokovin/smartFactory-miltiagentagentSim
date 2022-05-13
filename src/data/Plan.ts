import ProductionRobot from '../agents/ProductionRobot';
import { Command } from './Command';


export class Plan {
    commands: Command[];
    productionRobot: ProductionRobot;
    productionRobotIsReserved: boolean;
    constructor(commands: Command[], productionRobot: ProductionRobot) {
        this.commands = commands;
        this.productionRobot = productionRobot;
        this.productionRobotIsReserved = false;
    }
}
