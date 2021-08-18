import { updateElementAccess } from '../node_modules/typescript/lib/typescript';
import NumericalMonoid, { Factorization } from '../NumericalMonoid';
import { tupleGCD, flattenArray, euclideanDistance, product } from '../utils';

declare var Plotly;

window.onload = () => {
    [1, 2, 3].map(x => getInput(x)).forEach(x => {
        x.onchange = updateGenerators;
    });
    document.getElementById('element-input').onchange = e => {
        try {
            updateStateElement(parseInt((<HTMLInputElement>e.target).value))
        } catch (e) {
            console.error(e);
        }
    };
    document.getElementById('euclidean-checkbox').onchange = e => {
        updateEuclideanCheckbox((<HTMLInputElement>e.target).checked);
    }
    document.getElementById('explode-button').onclick = e => {
        updateStateElement(state.element, true);
    }

    const applyMoveElement = (x: number, b: boolean) => updateStateElement(moveUpOrDownByElement(x, b, state.element));
    document.onkeydown = (ev) => {
        switch (ev.key) {
            case 'a':
                applyMoveElement(1, true);
                break;
            case 'z':
                applyMoveElement(1, false);
                break;
            case 's':
                applyMoveElement(2, true);
                break;
            case 'x':
                applyMoveElement(2, false);
                break;
            case 'd':
                applyMoveElement(3, true);
                break;
            case 'c':
                applyMoveElement(3, false);
                break;
            default:
                return;
        }
    }

    updateGenerators();
}

const updateStateElement = (element: number, explode = false) => {
    state.element = element;
    (<HTMLInputElement>document.getElementById('element-input')).value = element.toString();
    (<HTMLInputElement>document.getElementById('catenary-input')).value = catenaryFunction(state.numericalMonoid, state.useEuclidean)(element).toString();
    renderPlotly(explode);
}

const updateEuclideanCheckbox = (useEuclidean: boolean) => {
    state.useEuclidean = useEuclidean;
    updateStateElement(state.element);
}

// const maxnonredFunction = (nm: NumericalMonoid, useEuclidean: boolean) => (useEuclidean ? nm.maxnonreducibleEdgesEuclidean : nm.maxnonreducibleEdges).bind(nm);
const catenaryFunction = (nm: NumericalMonoid, useEuclidean: boolean) =>
    (x: number) =>
        nm.catenaryDegreeByMetric(x, metricFunction(useEuclidean));
const metricFunction = (useEuclidean: boolean) => useEuclidean ? euclideanDistance : NumericalMonoid.distanceForClassicCatenary;

const state: {
    numericalMonoid: NumericalMonoid,
    element: number,
    useEuclidean: boolean
} = {
    numericalMonoid: null,
    element: 0,
    useEuclidean: false
};

const getInput = (id: number) => <HTMLInputElement>document.getElementById(`input${id}`);

const getValueOfInput = (id: number) => parseInt(getInput(id).value);

const numericalMonoidOfCurrentInputs = () => new NumericalMonoid([getValueOfInput(1), getValueOfInput(2), getValueOfInput(3)]);

const updateGenerators = () => {
    state.numericalMonoid = numericalMonoidOfCurrentInputs();
    // updateStateElement(state.numericalMonoid.frobenius() + 1);
    updateStateElement(state.numericalMonoid._catenaryBoundHypothesis());

    renderPlotly();
}

const moveUpOrDownByElement = (generatorIndex: number, up: boolean, currentElement: number) => {
    return currentElement + (up ? 1 : -1) * getValueOfInput(generatorIndex);
}

const facsMap = (factorizations, color) => {
    return {
        x: factorizations.map(x => x[0]),
        y: factorizations.map(x => x[1]),
        z: factorizations.map(x => x[2]),
        mode: 'markers',
        marker: {
            size: 5,
            line: {
                color: color,
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };
}

const colorMap = i => i == 0 ? "red" : i == 1 ? "blue" : "green";

const upByLcmOverG = (i, lcm, g) => (z, j) => j == i ? (z + lcm / g) : z;
const upByG = (i, lcm, g) => (z, j) => z + g;

const renderPlotly = (explode = false) => {
    let trace1 = {}, trace2 = {}, trace3 = {};
    if (explode) {
        const factorizations = state.numericalMonoid.factorizations(state.element);
        const lcm = product(state.numericalMonoid.generators);
        const exploded: Factorization[][] = state.numericalMonoid.generators.map((g, i) =>
            factorizations.map(y => y.map(
                upByLcmOverG(i, lcm, g))));   // make 3 sets, each exploded upward in the ith direction
        [trace1, trace2, trace3] = exploded.map((x, i) => facsMap(x, colorMap(i)));
        const maxnonredTraces = [];
        const metric = metricFunction(state.useEuclidean);
        const MST = state.numericalMonoid.minimalSpanningTreeByMetric(state.element, metric);
        const distances = MST.map(([index1, index2]) => metric(factorizations[index1], factorizations[index2]));
        const minDistance = Math.min(...distances);
        const minEdges = MST;//.filter((pair, index) => distances[index] === minDistance);
        let minimalMSTTraces = [];
        let aggregateGlobalAxisMax = 0;
        exploded.forEach((explodee, i) => {
            minimalMSTTraces = minimalMSTTraces.concat(minEdges.map((indexPair) => ({
                x: indexPair.map(x => explodee[x][0]),
                y: indexPair.map(x => explodee[x][1]),
                z: indexPair.map(x => explodee[x][2]),
                mode: 'lines',
                marker: {
                    size: 11,
                    line: {
                        color: colorMap(i),
                        width: 0.5
                    },
                    opacity: 0.8
                },
                type: 'scatter3d'
            })));
            const arrayOfFactorizationComponents = flattenArray([0, 1, 2].map(x => explodee.map(fac => fac[x])));
            const globalAxisMax = Math.max(...arrayOfFactorizationComponents);
            aggregateGlobalAxisMax = Math.max(aggregateGlobalAxisMax, globalAxisMax);
        });
        const axisLayout = { range: [0, aggregateGlobalAxisMax] };
        const layout = {
            scene: {
                aspectmode: "manual",
                aspectratio: {
                    x: 1, y: 1, z: 1,
                },
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 0
                },
                xaxis: axisLayout,
                yaxis: axisLayout,
                zaxis: axisLayout
            }
        };

        try {
            Plotly.purge('plotly-container');
        } catch (e) {
            0;
        }
        Plotly.newPlot('plotly-container', [trace1, trace2, trace3, ...maxnonredTraces, ...minimalMSTTraces], layout);

    } else {
        const factorizations = state.numericalMonoid.factorizations(state.element);
        trace1 = facsMap(factorizations, 'rgba(217, 217, 217, 0.14)');

        // const maxnonred = maxnonredFunction(state.numericalMonoid, state.useEuclidean)(state.element);
        const maxnonredTraces =
            [];
        // maxnonred.map(pair => {
        //     const pairWithMaybeGCDMidpoint = state.useEuclidean ? pair : [pair[0], tupleGCD(pair[0], pair[1]), pair[1]];
        //     return {
        //         x: pairWithMaybeGCDMidpoint.map(x => x[0]),
        //         y: pairWithMaybeGCDMidpoint.map(x => x[1]),
        //         z: pairWithMaybeGCDMidpoint.map(x => x[2]),
        //         mode: 'lines',
        //         type: 'scatter3d'
        //     }
        // });

        const metric = metricFunction(state.useEuclidean);
        const MST = state.numericalMonoid.minimalSpanningTreeByMetric(state.element, metric);
        const distances = MST.map(([index1, index2]) => metric(factorizations[index1], factorizations[index2]));
        const minDistance = Math.min(...distances);
        const minEdges = MST;//.filter((pair, index) => distances[index] === minDistance);
        const minimalMSTTraces = minEdges.map((indexPair) => ({
            x: indexPair.map(x => factorizations[x][0]),
            y: indexPair.map(x => factorizations[x][1]),
            z: indexPair.map(x => factorizations[x][2]),
            mode: 'lines',
            // marker: {
            //     size: 12,
            //     line: {
            //         color: 'rgba(217, 217, 217, 0.14)',
            //         width: 0.5
            //     },
            //     opacity: 0.8
            // },
            type: 'scatter3d'
        }));
        const arrayOfFactorizationComponents = flattenArray([0, 1, 2].map(x => factorizations.map(fac => fac[x])));
        const globalAxisMax = Math.max(...arrayOfFactorizationComponents);
        const axisLayout = { range: [0, globalAxisMax] };
        const layout = {
            scene: {
                aspectmode: "manual",
                aspectratio: {
                    x: 1, y: 1, z: 1,
                },
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 0
                },
                xaxis: axisLayout,
                yaxis: axisLayout,
                zaxis: axisLayout
            }
        };
        try {
            Plotly.purge('plotly-container');
        } catch (e) {
            0;
        }
        Plotly.newPlot('plotly-container', [trace1, ...maxnonredTraces, ...minimalMSTTraces], layout);
    }
}