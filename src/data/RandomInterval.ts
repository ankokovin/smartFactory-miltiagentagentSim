import { randomInt, randomNumber } from "../utils"

export default interface RandomInterval {
    isDiscrete: boolean
    start: number
    end: number
}

export function getRandomNumber(rndi: RandomInterval): number {
    if (rndi.isDiscrete) {
        return randomInt(Math.floor(rndi.start), Math.ceil(rndi.end + 0.01))
    }
    return randomNumber(rndi.start, rndi.end)
}