import { NumericalMonoid } from './NumericalMonoid';

declare var Plotly;

window.onload = () => {
    [1,2,3].map(x => getInput(x)).forEach(x => {
        x.onchange = updateGenerators;
    });
    document.getElementById('element-input').onchange = e => {
        try {
            updateStateElement(parseInt((<HTMLInputElement>e.target).value))
        } catch (e) {
            console.error(e);
        }
    };

    document.onkeydown = (ev) => {
        switch (ev.key) {
            case 'a':
            updateStateElement(moveUpOrDownByElement(1, true, state.element));
            break;
            case 'z':
            updateStateElement(moveUpOrDownByElement(1, false, state.element));
            break;
            case 's':
            updateStateElement(moveUpOrDownByElement(2, true, state.element));
            break;
            case 'x':
            updateStateElement(moveUpOrDownByElement(2, false, state.element));
            break;
            case 'd':
            updateStateElement(moveUpOrDownByElement(3, true, state.element));
            break;
            case 'c':
            updateStateElement(moveUpOrDownByElement(3, false, state.element));
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
    (<HTMLInputElement>document.getElementById('catenary-input')).value = state.numericalMonoid.catenaryDegree(element).toString();
    renderPlotly();
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
            size: 12,
            line: {
                color: 'rgba(217, 217, 217, 0.14)',
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };
    const maxnonred = state.numericalMonoid.maxnonreducibleEdges(state.element);
    const maxnonredTraces = maxnonred.map(pair => {
        return {
            x: pair.map(x => x[0]),
            y: pair.map(x => x[1]),
            z: pair.map(x => x[2]),
            mode: 'lines',
            type: 'scatter3d'
        }
    });
    const layout = {margin: {
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
    Plotly.newPlot('plotly-container', [trace1, ...maxnonredTraces], layout);
}