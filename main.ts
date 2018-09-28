import { NumericalMonoid } from './NumericalMonoid';

let Plotly;
let cytoscape;

window.onload = () => {
    [1,2,3].map(x => getInput(x)).forEach(x => {
        x.onchange = updateGenerators;
    });
    
    document.onkeydown = (ev) => {
        switch (ev.key) {
            case 'a':
                state.element = moveUpOrDownByElement(1, true, state.element);
                break;
            case 'z':
                state.element = moveUpOrDownByElement(1, false, state.element);
                break;
            case 's':
                state.element = moveUpOrDownByElement(2, true, state.element);
                break;
            case 'x':
                state.element = moveUpOrDownByElement(2, false, state.element);
                break;
            case 'd':
                state.element = moveUpOrDownByElement(3, true, state.element);
                break;
            case 'c':
                state.element = moveUpOrDownByElement(3, false, state.element);
                break;
            default:
                return;
        }

        updateGenerators();
    }
}

const state: {
    numericalMonoid: NumericalMonoid,
    element: number
} = {
    numericalMonoid: null,
    element: 0,
};

const getInput = (id: number) => <HTMLInputElement>document.getElementById(`input${id}`);

const getValueOfInput = (id: number) => parseInt(getInput(id).value);

const numericalMonoidOfCurrentInputs = () => new NumericalMonoid([getValueOfInput(1), getValueOfInput(2), getValueOfInput(3)]);

const updateGenerators = () => {
    state.numericalMonoid = numericalMonoidOfCurrentInputs();
    state.element = state.numericalMonoid.frobenius();

    renderPlotly();
}

const moveUpOrDownByElement = (generatorIndex: number, up: boolean, currentElement: number) => {
    return currentElement + (up ? 1 : -1) * getValueOfInput(generatorIndex);
}

const renderPlotly = () => {
    const factorizations = state.numericalMonoid.factorizations(state.element);
    var trace1 = {
        x: factorizations.map(x => x[0]),
        y: factorizations.map(x => x[1]),
        z: factorizations.map(x => x[2]),
        mode: 'markers',
        marker: {
            size: 12,
            line: {
                color: 'rgba(217, 217, 217, 0.14)',
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };
    var layout = {margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0
      }};
    try {
        Plotly.purge('plotly-container');
    } catch (e) {
        0;
    }
    Plotly.newPlot('plotly-container', [trace1], layout);
}