import Order from "./Order"

export type AddNewEvent = (a: AgentEvent) => void
export type Time = number
export type AgentEventResult = void | Order
export class AgentEventArgument {}
export type EventHandler = (currentTime: Time, addNewEventHandler: AddNewEvent, object?: AgentEventArgument) => AgentEventResult 
export default interface AgentEvent {
    time: Time
    eventHandler: EventHandler
    object?: AgentEventArgument
} 