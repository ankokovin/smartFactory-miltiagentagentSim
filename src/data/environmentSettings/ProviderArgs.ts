import RandomInterval from "../RandomInterval";

export default interface ProviderArgs {
    safetyMultiplyer : number
    supplyQueryTimeout : RandomInterval
    supplyOrderDuration : RandomInterval
    supplyOrderTimeout : RandomInterval
}