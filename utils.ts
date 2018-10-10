export const zeroThroughN = (n) => Array.from(Array(n).keys());

export const addOneAtIndex = (array: number[], index: number) => {
    const array2 = array.slice();
    array2[index] += 1;
    return array2;
}

export const tupleGCD = (fac1: number[], fac2: number[]) => zeroThroughN(fac1.length).map(x => Math.min(fac1[x], fac2[x]));
export const tupleMinus = (fac1: number[], fac2: number[]) => zeroThroughN(fac1.length).map(x => fac1[x] - fac2[x]);
export const sum = (fac: number[]) => fac.reduce((a,b) => a+b, 0);

export const euclideanDistance = (fac1: number[], fac2: number[]) => Math.pow(sum(fac1.map((el,i) => Math.pow(fac2[i] - fac1[i], 2))), 0.5);

export const flattenArray = <T>(arrOfArrs: T[][]) => arrOfArrs.reduce((a,b) => a.concat(b), []);