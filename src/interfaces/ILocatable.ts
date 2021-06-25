import Point from "../data/Point";

export default interface ILocatable {
    position: Point
}

function DistanceSquare(a: Point , b: Point) {
    return (a.x-b.x)**2 + (a.y-b.y)**2
}

function DistSqr <A extends ILocatable, B extends ILocatable>(a: A, b: B) : number {
    return DistanceSquare(a.position, b.position)
}

export function Dist  <A extends ILocatable, B extends ILocatable>(a: A, b: B) : number {
    return Math.sqrt(DistSqr(a, b))
}

export function chooseClosest <A  extends ILocatable, B extends ILocatable, C extends ILocatable>(a: A, b: B, c: C) : A | B {
    const distA = DistSqr(a, c);
    const distB = DistSqr(b, c);
    return distA > distB ? b : a
}