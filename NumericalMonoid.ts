import { JSONHashSet } from './Hash';
import { zeroThroughN, addOneAtIndex } from './utils';

let cytoscape;

export class NumericalMonoid {
    generators: number[];
    cachedFacs: Map<number, number[][]>;

    constructor(generators: number[]) {
        this.generators = generators;
    }

    factorizations(n: number): number[][] {
        if (n < 0) {
            return [];
        } else if (n == 0) {
            return [(new Array(this.generators.length)).fill(0)];
        } else if (this.cachedFacs.has(n)) {
            return this.cachedFacs.get(n);
        } else {
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
            if (zeroThroughN(Math.min(...this.generators)).every(x => this.factorizations(n+x).length == 0)) {
                return n;
            }
        }
    }

    bettiElements(n: number): number[] {
        throw new Error();
        return [];
    }

    catenaryDegree(n: number): number {
        throw new Error();
        return 0;
    }

    maxnonreducibleEdges(n: number): number[][][] {
        // Returns the set of nonreducible edges that are maximal (i.e. d = catenary degree)
        const factorizations = this.factorizations(n);
        const catenaryDegree = this.catenaryDegree(n);
        const g = cytoscape({
            elements: factorizations.map(fac => ({ id: JSON.stringify(fac) }))
        }); // just vertices for now, edges next
        const maximalEdges = [];
        for (let fac1 of factorizations) {
            for (let fac2 of factorizations) {
                const d = this.distance(fac1, fac2);
                if (d < catenaryDegree) {
                    g.add({
                        source: JSON.stringify(fac1),
                        target: JSON.stringify(fac2)
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
                root: JSON.stringify(fac1),
                target: JSON.stringify(fac2)
            }).found) {
                returnSet.add([fac1, fac2]);
            }
        }

        return returnSet.toArray();
    }

    distance(fac1: number[], fac2: number[]): number {
        throw new Error();
    }
}
