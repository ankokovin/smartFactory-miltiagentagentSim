import Resource from '../data/material/Resource';
import IAgent from '../interfaces/IAgent'
import { randomInt } from '../utils';
import Holder from './Holder';
import { strict as assert } from 'assert';
import IMoveable from '../interfaces/IMovable';
import Point from '../data/Point';

let counter = 0;



export default class LogisticRobot implements IAgent, IMoveable{
    id: string
    position: Point
    speed: number
    target?: Point
    newPlace?: Holder
    resource?: Resource 
    subscriber?: () => void = undefined
    constructor(speed: number, position? : Point) {
        this.id = `LogisticRobot-${++counter}`
        this.position = position ?? {x: randomInt(0, 1000), y: randomInt(0, 1000)}
        this.speed = speed
    }
    updatePosition(newPosition: Point): void {
        this.position = newPosition
        if (this.resource?.isBeingHeld) {
            this.resource.updatePosition(newPosition)
        }
    }
    run() {
        if (this.target) {
            let vec = {
                x: this.target.x - this.position.x,
                y: this.target.y - this.position.y
            }
            let mag = vec.x*vec.x+vec.y*vec.y 
            if (mag <= this.speed*this.speed) {
                this.updatePosition({
                    x: this.target.x,
                    y: this.target.y
                })
                if (this.resource) {
                    this.resource.isBeingHeld = !this.resource.isBeingHeld
                    if (!this.resource.isBeingHeld) {
                        console.log(`robot ${this.id} brought resource!`)
                        this.newPlace?.addResource(this.resource)
                        this.resource = undefined
                        this.newPlace = undefined
                        this.target = undefined
                        if (this.subscriber) this.subscriber()
                        this.subscriber = undefined
                    } else {
                        this.target = this.newPlace?.position
                    }
                }
            } else {
                vec = {
                    x: vec.x * this.speed / Math.sqrt(mag),
                    y: vec.y * this.speed / Math.sqrt(mag)
                }
                this.updatePosition({
                    x: this.position.x + vec.x,
                    y: this.position.y + vec.y 
                })
            }
        }
    }

    pickupResource(resource: Resource, newPlace: Holder, subscriber?: () => void) {
        console.log(`robot ${this.id} goes to pickup ${JSON.stringify(resource)}`)
        this.resource = resource
        this.target = resource.position
        this.newPlace = newPlace
        this.subscriber = subscriber
    }
}