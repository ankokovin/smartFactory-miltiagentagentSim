function DistanceSquare(a, b) {
    return Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2);
}
function DistSqr(a, b) {
    return DistanceSquare(a.position, b.position);
}
export function Dist(a, b) {
    return Math.sqrt(DistSqr(a, b));
}
export function chooseClosest(a, b, c) {
    const distA = DistSqr(a, c);
    const distB = DistSqr(b, c);
    return distA > distB ? b : a;
}
