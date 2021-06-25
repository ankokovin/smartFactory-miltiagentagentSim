import IAgent from '../interfaces/IAgent'
import Order from '../data/Order'
import { randomNumber } from '../utils';
import Holder from './Holder';
import ILocatable from '../interfaces/ILocatable';
import ResourceType from '../data/types/ResourceType';
import Resource from '../data/material/Resource';
let idx = 0;

export default class Customer extends Holder implements IAgent, ILocatable {
    id: string;
    orderProbability: number;
    constructor(orderProbability: number) {
        super({x: 0, y:500});
        this.id = `Customer-${++idx}` 
        this.orderProbability = orderProbability
    }

    run() : Order | undefined {
        if (Math.random() <= this.orderProbability) {
            return new Order(randomNumber(1, 10) , `Product-${randomNumber(1, 10)}`, 'test')
        }
    }

    getResource(r: ResourceType, targetQuantity: number) : Resource | null {
        throw new Error("cannot get from customer")
    }
}