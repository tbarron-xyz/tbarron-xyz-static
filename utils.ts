export const zeroThroughN = (n) => Array.from(Array(n).keys());

export const addOneAtIndex = (array: number[], index: number) => {
    const array2 = array.slice();
    array2[index] += 1;
    return array2;
}