import NumericalMonoid from './NumericalMonoid';
exports.NumericalMonoid = NumericalMonoid;

export default class NumericalMonoidCatenaryQuasiconstantBound {
    generators: [number, number, number];
    constructor() {

    }

    static reduceGenerators = (generators: number[]) => {

    }

    static removeMultiples = (generators: number[]) => {
        return generators.filter((g1,i,a) => a.slice(i).some(g2 => g2 % g1 === 0 || g1 % g2 === 0));
    }

    solve() {
        const reducedGenerators = NumericalMonoidCatenaryQuasiconstantBound.reduceGenerators(this.generators);
        
    }
}

export const num = new NumericalMonoid([11, 34, 35]);
console.log(num.bettiElements());
console.log(num.satisfiesCatenaryBoundHypothesis());