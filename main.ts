import NumericalMonoid from './NumericalMonoid';
exports.NumericalMonoid = NumericalMonoid;

for (let gens of [[11, 12, 14], [11, 13, 15], [11, 13, 16]]) {
    const num = new NumericalMonoid(gens);
    for (let i = 150; i < 1500; i++) {
        console.log(i, num.percent_of_edges_that_are_minimal(i, NumericalMonoid.distanceForClassicCatenary));
    }
    // const mst100 = num.minimalSpanningTreeByMetric(100, NumericalMonoid.distanceForClassicCatenary);
    // const mst1000 = num.minimalSpanningTreeByMetric(1000, NumericalMonoid.distanceForClassicCatenary);
    // console.log(mst100);
    // console.log(mst1000);
    //     console.log(num.satisfiesCatenaryBoundHypothesis(NumericalMonoid.distanceForClassicCatenary));
    //     console.log(num.satisfiesCatenaryBoundHypothesisEuclidean());
    //     // console.log(num.bettiElements().map(x => num.maxnonreducibleEdges(x)));
    //     // console.log(num.bettiElements().map(x => num.maxnonreducibleEdgesEuclidean(x)));
}
// console.log(`Betti elements: ${num.bettiElements()}`);

// console.log(num.catenaryDegreeEuclidean(115));
// console.log(num.catenaryDegreeEuclidean(2117));
// console.log(num.maxnonreducibleEdgesEuclidean(2117));
debugger;