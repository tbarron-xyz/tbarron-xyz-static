import NumericalMonoid from '../NumericalMonoid';
import { tupleGCD, flattenArray, euclideanDistance } from '../utils';

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

    const usemuodbe = (x: number, b: boolean) => updateStateElement(moveUpOrDownByElement(x, b, state.element));
    document.onkeydown = (ev) => {
        switch (ev.key) {
            case 'a':
                usemuodbe(1, true);
                break;
            case 'z':
                usemuodbe(1, false);
                break;
            case 's':
                usemuodbe(2, true);
                break;
            case 'x':
                usemuodbe(2, false);
                break;
            case 'd':
                usemuodbe(3, true);
                break;
            case 'c':
                usemuodbe(3, false);
                break;
            default:
                return;
        }
    }

    updateGenerators();
}

const updateStateElement = (element: number) => {
    state.element = element;
    (<HTMLInputElement>document.getElementById('element-input')).value = element.toString();
    (<HTMLInputElement>document.getElementById('catenary-input')).value = catenaryFunction(state.numericalMonoid, state.useEuclidean)(element).toString();
    renderPlotly();
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
    updateStateElement(state.numericalMonoid.frobenius() + 1);

    renderPlotly();
}

const moveUpOrDownByElement = (generatorIndex: number, up: boolean, currentElement: number) => {
    return currentElement + (up ? 1 : -1) * getValueOfInput(generatorIndex);
}

const renderPlotly = () => {
    const factorizations = state.numericalMonoid.factorizations(state.element);
    const trace1 = {
        x: factorizations.map(x => x[0]),
        y: factorizations.map(x => x[1]),
        z: factorizations.map(x => x[2]),
        mode: 'markers',
        marker: {
            size: 5,
            line: {
                color: 'rgba(217, 217, 217, 0.14)',
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };

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