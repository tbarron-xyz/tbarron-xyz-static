declare module "kruskal" {
    const kruskal: <T>(
        vertices: T[],
        edgesAsVertexIndexPairs: [number, number][],
        metric: (v1: T, v2: T) => number
    ) => [number, number][];
}