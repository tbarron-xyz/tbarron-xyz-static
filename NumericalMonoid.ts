import cytoscape = require('cytoscape');

import { JSONHashSet, HashSet } from './Hash';
import { zeroThroughN, addOneAtIndex, tupleMinus, tupleGCD, sum, euclideanDistance, flattenArray, product, numberArrayEqualityCheck } from './utils';

import mat3 from './lib/tsm/src/mat3';
import mat2 from './lib/tsm/src/mat2';

// declare var cytoscape;

type Factorization = number[];

export default class NumericalMonoid {
    generators: number[];
    cachedFacs: Map<number, Factorization[]>;
    cachedCatenaryDegrees: Map<number, number>;

    calculatingNonMemoizedFactorizationCallback?: ((n: number) => void);

    constructor(generators: number[]) {
        this.generators = generators;
        this.cachedFacs = new Map<number, number[][]>();
        this.cachedCatenaryDegrees = new Map<number, number>();
    }

    factorizations(n: number): Factorization[] {
        if (n < 0) {
            return [];
        } else if (n == 0) {
            return [(new Array(this.generators.length)).fill(0)];
        } else if (this.cachedFacs.has(n)) {
            return this.cachedFacs.get(n);
        } else {
            if (this.calculatingNonMemoizedFactorizationCallback) this.calculatingNonMemoizedFactorizationCallback(n);
            const predecessorFactorizationsUpped = this.generators.map((generator, index) => {
                return this.factorizations(n - generator).map(x => addOneAtIndex(x, index));
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

    hasElement(n: number): boolean {
        return this.factorizations(n).length > 0;
    }

    frobenius(): number {
        for (let n = 0; ; n++) {
            if (zeroThroughN(Math.min(...this.generators)).every(x => this.hasElement(n + x))) {
                return n - 1;
            }
        }
    }

    elementIsBetti = (n: number) => !this.elementIsNotBetti(n);

    elementIsNotBetti(n: number) {
        if (this.generators.length !== 3) {
            throw new Error('this only works on 3 generators for now');
        }
        const vert = this.generators.filter(x => this.hasElement(n - x));
        const dim = vert.length;
        if (dim === 1) return true;
        const matDim = dim === 3 ? mat3 : mat2;
        const adj = new matDim();
        for (let i = 0; i < dim; i++) {
            for (let j = i; j < dim; j++) {
                if (this.hasElement(n - vert[i] - vert[j])) {
                    const newValues = zeroThroughN(dim ** 2).map(x => {
                        const index1 = i * dim + j;
                        const index2 = i + j * dim;
                        return (x === index1 || x === index2) ? 1 : adj.at(x);
                    });
                    adj.init(newValues);
                }
            }
        }

        const c = new matDim().setIdentity();
        const aa = new matDim().setIdentity();
        for (let i = 0; i < dim; i++) {
            (aa as any).multiply(adj);
            const newC = zeroThroughN(dim ** 2).map(x => c.at(x) + aa.at(x));
            c.init(newC);
        }

        for (let i = 0; i < dim; i++) {
            for (let j = i + 1; j < dim; j++) {
                const index = i * dim + j;
                if (c.at(index) === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    bettiElementCandidates() {
        const ap: number[] = this.AperyListOfNumericalSemigroupWRTElement(this.generators[0]);
        return Array.from(new Set(flattenArray(this.generators.map(x => ap.map(m => m + x))))); //.filter((x,i,a) => !a.slice(i+1).includes(x));

    }

    bettiElements(): number[] {
        if (this.generators.length === 1) {
            return [];
        }
        // const ap = ap1.slice(1);//# I remove the zero,
        //#   minimal generators yield conneted graphs
        const candidates = this.bettiElementCandidates();
        //# Gn not conneted implies n = wi + minimalgenerator
        //#    thus these are the candidates
        return candidates.filter(x => this.elementIsBetti(x));
        //# choose n with nonconnected graphs
    }

    AperyListOfNumericalSemigroupWRTElement(n: number): number[] {
        return zeroThroughN(n).map(x => {
            for (let i = 0; ; i++) {
                const elem = x + i * n;
                if (this.hasElement(elem)) {
                    return elem;
                }
            }
        });
    }

    catenaryDegree(n: number): number {
        if (this.cachedCatenaryDegrees.has(n)) return this.cachedCatenaryDegrees.get(n);
        const factorizations = this.factorizations(n);
        for (let i = 0; ; i++) {
            const g = cytoscape({});
            factorizations.forEach(fac => g.add({ data: { id: JSON.stringify(fac) } }));    // first pass: add all nodes. can't add edges if one end isn't there yet
            factorizations.forEach(fac1 => {
                factorizations.forEach(fac2 => {
                    if (numberArrayEqualityCheck(fac2, fac1)) return;
                    const distance = this.distanceForClassicCatenary(fac1, fac2);
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

    maxnonreducibleEdgesByMetric(n: number, metric: (fac1, fac2: number[]) => number): Factorization[][] {
        // Returns the set of nonreducible edges that are maximal (i.e. d = catenary degree)
        const factorizations = this.factorizations(n);
        const catenaryDegree = this.catenaryDegreeByMetric(n, metric);
        const vertices = factorizations.map(fac => ({ data: { id: JSON.stringify(fac) } }));
        const g = cytoscape({
            elements: vertices
        }); // just vertices for now, edges next
        const maximalEdges = [];
        for (let fac1 of factorizations) {
            for (let fac2 of factorizations) {
                if (numberArrayEqualityCheck(fac2, fac1)) continue;
                const d = metric(fac1, fac2);
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

    maxnonreducibleEdgesEuclidean = (n: number) => this.maxnonreducibleEdgesByMetric(n, euclideanDistance);

    catenaryDegreeByMetric(n: number, metric: (fac1, fac2: Factorization) => number): number {
        const factorizations = this.factorizations(n);
        const pairwiseDistancesPre = new Set<number>();
        factorizations.forEach(fac1 => {
            factorizations.forEach(fac2 => {
                pairwiseDistancesPre.add(euclideanDistance(fac1, fac2));
            });
        });
        const bettis = this.bettiElements();
        // only include distances less than max distance betti element
        const pairwiseDistances = Array.from(pairwiseDistancesPre)
            .filter(x => x > Math.max(...bettis) ? x <= Math.max(...this.bettiElements().map(b => this.catenaryDegreeByMetric(b, metric))) : true)
            .sort((a, b) => b - a);
        for (let pairDistance of pairwiseDistances) {
            const g = cytoscape({});
            factorizations.forEach(fac => g.add({ data: { id: JSON.stringify(fac) } }));    // first pass: add all nodes. can't add edges if one end isn't there yet
            factorizations.forEach(fac1 => {
                factorizations.forEach(fac2 => {
                    if (numberArrayEqualityCheck(fac2, fac1)) return;
                    const distance = metric(fac1, fac2);
                    if (distance <= pairDistance) {
                        g.add({ data: { source: JSON.stringify(fac1), target: JSON.stringify(fac2) } });
                    }
                })
            });
            if (g.elements().components().length == 1) {
                this.cachedCatenaryDegrees.set(n, pairDistance);
                return pairDistance;
            }
        }
    }

    catenaryDegreeEuclidean = (x: number) => this.catenaryDegreeByMetric(x, euclideanDistance)

    maxnonreducibleEdges(n: number): Factorization[][] {
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
                if (numberArrayEqualityCheck(fac2, fac1)) continue;
                const d = this.distanceForClassicCatenary(fac1, fac2);
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

    distanceForClassicCatenary(fac1: Factorization, fac2: Factorization): number {
        const gcd = tupleGCD(fac1, fac2);
        return Math.max(sum(tupleMinus(fac1, gcd)), sum(tupleMinus(fac2, gcd)));
    }

    satisfiesCatenaryBoundHypothesis() {
        const lcm = product(this.generators);
        const boundHypothsis = this.frobenius() + Math.max(...this.bettiElements());
        console.log('boundHypothesis:', boundHypothsis, 'lcm:', lcm);
        const v1 = this.catenaryDegreeEuclidean(boundHypothsis);
        console.log('v1:', v1);
        console.log('init');
        for (let i = 0; i < product(this.generators.slice(1)); i++) {
            // preload
            const next = boundHypothsis + this.generators[0] * i;
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(next.toString());

            this.factorizations(next);
        }
        const facsup = this.factorizations(boundHypothsis + lcm);
        const v2 = this.catenaryDegreeEuclidean(boundHypothsis + lcm);
        console.log(v1, v2);
        return v1 === v2;
    }
}

