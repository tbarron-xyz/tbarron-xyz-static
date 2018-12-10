
import cytoscape = require('cytoscape');

import { JSONHashSet, HashSet } from './Hash';
import { zeroThroughN, addOneAtIndex, tupleMinus, tupleGCD, sum, euclideanDistance, flattenArray, product, numberArrayEqualityCheck } from './utils';

import mat3 from './lib/tsm/src/mat3';
import mat2 from './lib/tsm/src/mat2';

// / <reference path="kruskal.d.ts" />
import kruskal from 'kruskal';


type Factorization = number[];
type Metric = ((a: Factorization, b: Factorization) => number);
type MST = [number, number][];    // expressed as indexes in this.factorizations(n) which has a fixed order

export default class NumericalMonoid {
    generators: number[];
    cachedFacs: Map<number, Factorization[]>;
    cachedCatenaryDegrees: Map<number, number>;
    cachedCatenaryDegreesByMetric: Map<Metric, Map<number, number>>;
    cachedBettiElements: number[];
    cachedMSTsByMetric: Map<Metric, Map<number, MST>>;

    calculatingNewMemoizedFactorizationCallback?: ((n: number) => void);

    constructor(generators: number[]) {
        this.generators = generators.slice().sort((a, b) => a - b);
        this.cachedFacs = new Map<number, number[][]>();
        this.cachedCatenaryDegrees = new Map<number, number>();
        this.cachedCatenaryDegreesByMetric = new Map();
        this.cachedMSTsByMetric = new Map();
    }

    factorizations(n: number): Factorization[] {
        if (n < 0) {
            return [];
        } else if (n == 0) {
            return [(new Array(this.generators.length)).fill(0)];
        } else if (this.cachedFacs.has(n)) {
            return this.cachedFacs.get(n);
        } else {
            if (this.calculatingNewMemoizedFactorizationCallback) this.calculatingNewMemoizedFactorizationCallback(n);
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
        // from GAP
        const ap: number[] = this.AperyListOfNumericalSemigroupWRTElement(this.generators[0]);
        return Array.from(new Set(flattenArray(this.generators.map(x => ap.map(m => m + x))))); //.filter((x,i,a) => !a.slice(i+1).includes(x));

    }

    bettiElements(): number[] {
        if (this.generators.length === 1) {
            return [];
        }
        if (this.cachedBettiElements) {
            return this.cachedBettiElements;
        } else {
            // const ap = ap1.slice(1);//# I remove the zero,
            //#   minimal generators yield conneted graphs
            const candidates = this.bettiElementCandidates();
            //# Gn not conneted implies n = wi + minimalgenerator
            //#    thus these are the candidates
            const result = candidates.filter(x => this.elementIsBetti(x));
            this.cachedBettiElements = result;
            return result;
            //# choose n with nonconnected graphs
        }
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
                    const distance = NumericalMonoid.distanceForClassicCatenary(fac1, fac2);
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

    maxnonreducibleEdgesByMetric(n: number, metric: Metric): Factorization[][] {
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

    catenaryDegreeByMetric(n: number, metric: Metric): number {
        if (this.cachedCatenaryDegreesByMetric.has(metric)) {
            const metricCache = this.cachedCatenaryDegreesByMetric.get(metric);
            if (metricCache.has(n)) {
                return metricCache.get(n);
            }
        }
        const bettis = this.bettiElements();
        const bettiDistances = bettis.includes(n) ? [Infinity] : bettis.map(x => this.catenaryDegreeByMetric(x, metric));
        const factorizations = this.factorizations(n);
        const pairwiseDistancesLessThanMaxBettiElement = new Set();
        factorizations.forEach(fac1 => {
            factorizations.forEach(fac2 => {
                const distance = metric(fac1, fac2);
                if (distance <= Math.max(...bettiDistances)) {
                    pairwiseDistancesLessThanMaxBettiElement.add(distance);
                }
            });
        });
        // only include distances less-or-equal than the max catenary degree of a betti element,
        // except in the case above where the n is a betti element, in which case we compare with Infinity to safely include all edges and not get recursive calculation
        const pairwiseDistances = Array.from(pairwiseDistancesLessThanMaxBettiElement)
            .sort((a, b) => a - b);
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
                const metricCache = (this.cachedCatenaryDegreesByMetric.get(metric) || this.cachedCatenaryDegreesByMetric.set(metric, new Map()).get(metric));
                metricCache.set(n, pairDistance);
                return pairDistance;
            }
        }
    }

    minimalSpanningTreeByMetric(n: number, metric: Metric): [number, number][] {
        // Returns a list of pairs of indices pointing to factorizations within this.factorizations
        if (this.cachedMSTsByMetric.has(metric)) {
            const metricCache = this.cachedMSTsByMetric.get(metric);
            if (metricCache.has(n)) {
                return metricCache.get(n);
            }
        }
        const factorizations = this.factorizations(n);
        const bettiElements = this.bettiElements();
        let edges: [number, number][];
        if (n > Math.max(...bettiElements)) {
            const pairsOfElAndMst = this.generators
                .map(g => [n - g, this.minimalSpanningTreeByMetric(n - g, metric)] as [number, MST]);
            const factorizationPairs = pairsOfElAndMst
                .map(([el, mst], i) => mst
                    .map(([index1, index2]) => [
                        addOneAtIndex(this.factorizations(el)[index1], i),
                        addOneAtIndex(this.factorizations(el)[index2], i)
                    ] as [Factorization, Factorization]))
                .reduce((a, b) => a.concat(b), []);
            const factorizationsIndexMap = new Map<string, number>();
            factorizations.forEach((fac, i) => {
                factorizationsIndexMap.set(JSON.stringify(fac), i);
            });
            edges = [];
            factorizationPairs.forEach(([fac1, fac2]) => {
                const index1 = factorizationsIndexMap.get(JSON.stringify(fac1));
                const index2 = factorizationsIndexMap.get(JSON.stringify(fac2));
                edges.push([index1, index2]);
            });
        } else {
            edges = factorizations
                .map((fac1, index1) => factorizations
                    .map((fac2, index2) => [index1, index2] as [number, number]))
                .reduce((a, b) => a.concat(b), []);
        }
        const vertices = zeroThroughN(factorizations.length);
        const mstAsIndexPairs = kruskal.kruskal(vertices, edges, (index1, index2) => metric(factorizations[index1], factorizations[index2]));
        const metricCache = (this.cachedMSTsByMetric.get(metric) || this.cachedMSTsByMetric.set(metric, new Map()).get(metric));
        metricCache.set(n, mstAsIndexPairs);
        return mstAsIndexPairs;
        // .map(([index1, index2]) => [factorizations[index1], factorizations[index2]]);

    }

    catenaryDegreeByMetricDynamic(n: number, metric: Metric): number {
        const mst = this.minimalSpanningTreeByMetric(n, metric);
        return
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
                const d = NumericalMonoid.distanceForClassicCatenary(fac1, fac2);
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

    static distanceForClassicCatenary(fac1: Factorization, fac2: Factorization): number {
        const gcd = tupleGCD(fac1, fac2);
        return Math.max(sum(tupleMinus(fac1, gcd)), sum(tupleMinus(fac2, gcd)));
    }

    satisfiesCatenaryBoundHypothesis(metric: Metric) {
        const lcm = product(this.generators);
        const boundHypothesis = this.frobenius() + Math.max(...this.bettiElements());
        console.log('boundHypothesis:', boundHypothesis, 'lcm:', lcm);
        const v1 = this.catenaryDegreeByMetric(boundHypothesis, metric);
        console.log(`catenaryDegree(${boundHypothesis}):`, v1);
        console.log(`calculating catenaryDegree(${boundHypothesis + lcm})`);
        for (let i = 0; i < product(this.generators.slice(1)); i++) {
            // preload
            const next = boundHypothesis + this.generators[0] * i;
            const unsafeStdout = process.stdout as any;
            if (unsafeStdout.clearLine) {
                unsafeStdout.clearLine();
                unsafeStdout.cursorTo(0);
                process.stdout.write(`memoizing factorizations(${next})`);
            }

            this.factorizations(next);
        }
        const facsup = this.factorizations(boundHypothesis + lcm);
        const v2 = this.catenaryDegreeByMetric(boundHypothesis + lcm, metric);
        console.log(`catenaryDegree(${boundHypothesis + lcm}): ${v2}`);
        return v1 === v2;
    }

    satisfiesCatenaryBoundHypothesisEuclidean = () => this.satisfiesCatenaryBoundHypothesis(euclideanDistance);
}

