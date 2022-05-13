import { randomInt, randomNumber } from "../utils.js";
export function getRandomNumber(rndi) {
    if (rndi.isDiscrete) {
        return randomInt(Math.floor(rndi.start), Math.ceil(rndi.end + 0.01));
    }
    return randomNumber(rndi.start, rndi.end);
}
