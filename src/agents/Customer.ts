import IAgent from '../interfaces/IAgent'
import Order from '../data/Order'
import Holder from './Holder';
import ILocatable from '../interfaces/ILocatable';
import { AddNewEvent, EventHandler, Time } from '../data/AgentEvent';
import ProductModel from '../data/ProductModel';
import ProductModelEnum from '../data/ProductModelEnum';
import { AddOrderToEnv } from '../Environment';
import RandomInterval, { getRandomNumber } from '../data/RandomInterval';
import { getProcessTypes } from './ProcessMaker';
import { getRandom, randomInt } from '../utils';
import { isProductType } from '../data/types/ProductType';
import StartOrderProportion from '../data/environmentSettings/StartOrderProportion';
let idx = 0;

export default class Customer extends Holder implements IAgent, ILocatable {
    id: string
    private addNewOrderToEnvironment: AddOrderToEnv
    private newOrderDelay: RandomInterval
    private startOrderProportion: StartOrderProportion
    private getProcessTypes: getProcessTypes

    constructor(
            addNewOrderToEnvironment: AddOrderToEnv, 
            communicationDelay: RandomInterval, 
            orderIntervalDelay: RandomInterval, 
            startOrderProportion: StartOrderProportion,
            getProcessTypes: getProcessTypes
            ) {
        super(communicationDelay, {x: 0, y:500});
        this.id = `Customer-${++idx}` 
        this.addNewOrderToEnvironment = addNewOrderToEnvironment
        this.newOrderDelay = orderIntervalDelay
        this.startOrderProportion = startOrderProportion
        this.getProcessTypes = getProcessTypes
    }

    newOrderEvent: EventHandler = (currentTime: Time, addNewEventHandler: AddNewEvent) => {
        const productProcesses = this.getProcessTypes().filter(processType => isProductType(processType.output.type))
        const hasProcess = productProcesses.length !== 0
        let productModelType: ProductModelEnum;
        const dice = randomInt(0, 
            this.startOrderProportion.text 
            + this.startOrderProportion.image 
            + this.startOrderProportion.cad 
            + (hasProcess ? this.startOrderProportion.process : 0) 
            + 1)
        if (dice < this.startOrderProportion.text) {
            productModelType = ProductModelEnum.Text
        } else if (dice < this.startOrderProportion.text + this.startOrderProportion.image) {
            productModelType = ProductModelEnum.Image
        } else if (!hasProcess || dice < this.startOrderProportion.text + this.startOrderProportion.image + this.startOrderProportion.cad) {
            productModelType = ProductModelEnum.CAD
        } else {
            productModelType = ProductModelEnum.Process
        }
        
        const productId = hasProcess ? (getRandom(productProcesses)[0].output.type.id) : undefined

        addNewEventHandler({
            time: currentTime + getRandomNumber(this.communicationDelay), 
            eventHandler: (time) => {
                const order = new Order(1, new ProductModel(productModelType), time, productId)
                this.addNewOrderToEnvironment(order, time)
            }
        })
        addNewEventHandler({
            time: currentTime + getRandomNumber(this.newOrderDelay),
            eventHandler: this.newOrderEvent
        })
    }
}