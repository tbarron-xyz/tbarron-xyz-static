// This is a typescriptified version of https://github.com/abetusk/kruskal.js

import MakeSet from './union-find';


// vertices hold data that will be used in the distance 'metric' function
// edges holds position in vertices list
//
export const Kruskal = {
  kruskal: <T>(
    vertices: ReadonlyArray<T>,
    edgesAsIndexPairs: ReadonlyArray<[number, number]>,
    metric: (a: T, b: T) => number) => {
    var finalEdges: [number, number][] = [];

    const forest = new MakeSet(vertices.length);

    var edgeDist: { edge: [number, number], weight: number }[] = [];
    for (var ind in edgesAsIndexPairs) {
      const u = edgesAsIndexPairs[ind][0];
      const v = edgesAsIndexPairs[ind][1];
      const e = { edge: edgesAsIndexPairs[ind], weight: metric(vertices[u], vertices[v]) };
      edgeDist.push(e);
    }

    edgeDist.sort((a, b) => a.weight - b.weight);

    for (var i = 0; i < edgeDist.length; i++) {
      var u = edgeDist[i].edge[0];
      var v = edgeDist[i].edge[1];

      if (forest.find(u) != forest.find(v)) {
        finalEdges.push([u, v]);
        forest.link(u, v);
      }
    }

    return finalEdges;

  }
}



