import { array } from '../../../dataHelper.js';
import GridData from '../../../grid.js';
import { Color, Position } from '../../../primitives.js';
import { cell, region } from '../helper.js';
import InsightContext from '../insightContext.js';
import InsightLemma from './insightLemma.js';

export default class ConnectThroughBottleneck extends InsightLemma {
  public readonly id = 'connect-through-bottleneck';

  public isApplicable(_grid: GridData): boolean {
    return true;
  }

  public apply(context: InsightContext): boolean {
    const grid = context.grid;
    const regionStore = context.regionStore;
    let progress = false;
    const visited = array(grid.width, grid.height, () => false);
    while (true) {
      const seed = grid.find(
        (t, x, y) => !visited[y][x] && t.exists && t.color !== Color.Gray
      );
      if (!seed) break;

      // Find a region with disconnected areas
      const proof = this.proof().difficulty(3);
      const regionMap = regionStore.getRegionMap(seed, proof);
      const color = grid.getTile(seed.x, seed.y).color;
      regionMap.cells.forEach((row, y) =>
        row.forEach((cell, x) => {
          if (cell !== false) visited[y][x] = true;
        })
      );
      if (regionMap.islands.length <= 1) continue;

      // Compute shortest paths between the islands and compare them to the articulation points in the graph.
      // Haven't proven this rigorously, but I think chokepoints between two islands correspond to the intersection
      // of the shortest paths between the islands and the articulation points in the graph.
      const graph = regionStore.getGraph(seed, proof);
      const island1 = regionMap.islands[0];
      const chokepoints: Position[] = [];
      for (let i = 1; i < regionMap.islands.length; i++) {
        const island2 = regionMap.islands[i];
        const path = graph.shortestPath(
          graph.getId(island1.x, island1.y),
          graph.getId(island2.x, island2.y)
        );
        for (const id of path) {
          if (graph.articulationPoints.has(id)) {
            chokepoints.push(...graph.getPositions(id));
          }
        }
      }
      if (chokepoints.length === 0) continue;

      // color all chokepoints and add a proof
      let modified = false;
      const newTiles = grid.tiles.map(row => row.slice());
      for (const { x, y } of chokepoints) {
        if (grid.getTile(x, y).color === color) continue;
        newTiles[y][x] = newTiles[y][x].copyWith({ color });
        modified = true;
      }
      context.setTiles(
        newTiles,
        proof.describe(
          `Cells at ${chokepoints.map(p => cell(p)).join(', ')} are bottlenecks connecting ${regionMap.islands.map(island => region(island)).join(', ')}, so they must be filled in`
        )
      );
      progress ||= modified;
    }
    return progress;
  }
}
