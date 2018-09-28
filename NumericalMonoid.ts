import { JSONHashSet } from './Hash';
import { zeroThroughN, addOneAtIndex, tupleMinus, tupleGCD, sum } from './utils';

declare var cytoscape;

export class NumericalMonoid {
    generators: number[];
    cachedFacs: Map<number, number[][]>;
    cachedCatenaryDegrees: Map<number, number>;

    constructor(generators: number[]) {
        this.generators = generators;
        this.cachedFacs = new Map<number, number[][]>();
        this.cachedCatenaryDegrees = new Map<number, number>();
    }

    factorizations(n: number): number[][] {
        if (n < 0) {
            return [];
        } else if (n == 0) {
            return [(new Array(this.generators.length)).fill(0)];
        } else if (this.cachedFacs.has(n)) {
            return this.cachedFacs.get(n);
        } else {
            console.log(n, this);
            const predecessorFactorizationsUpped = this.generators.map((generator, index) => {
                return this.factorizations(n-generator).map(x => addOneAtIndex(x, index));
            });
            const returnSet = new JSONHashSet<number[]>();
            predecessorFactorizationsUpped.forEach(x => {
                x.forEach(factorization => returnSet.add(factorization));
            });
            const returnArray = returnSet.toArray();
            this.cachedFacs.set(n, returnArray);
            return returnArray;
        }
    }

    frobenius(): number {
        for (let n = 0; ; n++) {
            if (zeroThroughN(Math.min(...this.generators)).every(x => this.factorizations(n+x).length > 0)) {
                return n-1;
            }
        }
    }

    bettiElements(n: number): number[] {
        throw new Error();
        return [];
    }

    catenaryDegree(n: number): number {
        if (this.cachedCatenaryDegrees.has(n)) return this.cachedCatenaryDegrees.get(n);
        const factorizations = this.factorizations(n);
        for (let i = 0; ; i++) {
            const g = cytoscape({});
            factorizations.forEach(fac => g.add({ data: { id: JSON.stringify(fac) } }));    // first pass: add all nodes. can't add edges if one end isn't there yet
            factorizations.forEach(fac1 => {
                factorizations.forEach(fac2 => {
                    if (JSON.stringify(fac2) == JSON.stringify(fac1)) return;
                    const distance = this.distance(fac1, fac2);
                    if (distance <= i) {
                        g.add({ data: { source: JSON.stringify(fac1), target: JSON.stringify(fac2) } });
                    }
                })
            });
            if (g.elements().components().length == 1) {
                this.cachedCatenaryDegrees.set(n, i);
                return i;
            }
        }
    }

    maxnonreducibleEdges(n: number): number[][][] {
        // Returns the set of nonreducible edges that are maximal (i.e. d = catenary degree)
        const factorizations = this.factorizations(n);
        const catenaryDegree = this.catenaryDegree(n);
        const vertices = factorizations.map(fac => ({ data: { id: JSON.stringify(fac) } }));
        const g = cytoscape({
            elements: vertices
        }); // just vertices for now, edges next
        const maximalEdges = [];
        for (let fac1 of factorizations) {
            for (let fac2 of factorizations) {
                if (JSON.stringify(fac2) == JSON.stringify(fac1)) continue;
                const d = this.distance(fac1, fac2);
                if (d < catenaryDegree) {
                    g.add({
                        data: {
                            source: JSON.stringify(fac1),
                            target: JSON.stringify(fac2)
                        }
                    });
                } else if (d == catenaryDegree) {
                    maximalEdges.push([fac1, fac2]);
                }
            }
        }

        const returnSet = new JSONHashSet<number[][]>();
        for (let [fac1, fac2] of maximalEdges) {
            // If this maximal edge is not reducible...
            if (!returnSet.has([fac2, fac1]) &&   // Make sure we don't have any reverse-order duplicates
            !g.elements().aStar({
                root: g.nodes(`node[id="${JSON.stringify(fac1)}"]`),
                goal: g.nodes(`node[id="${JSON.stringify(fac2)}"]`)
            }).found) {
                returnSet.add([fac1, fac2]);
            }
        }

        return returnSet.toArray();
    }

    distance(fac1: number[], fac2: number[]): number {
        const gcd = tupleGCD(fac1, fac2);
        return Math.max(sum(tupleMinus(fac1, gcd)), sum(tupleMinus(fac2, gcd)));
    }
}
