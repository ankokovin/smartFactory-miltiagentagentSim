import { AgentEventArgument, EventHandler } from '../data/AgentEvent';
import { Command } from '../data/Command';


export default class LogisticRobotMoveQuery extends AgentEventArgument {
    command: Command;
    callback: EventHandler;
    constructor(command: Command, callback: EventHandler) {
        super();
        this.command = command;
        this.callback = callback;
    }
}
