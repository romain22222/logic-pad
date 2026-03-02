import GridData from '../../../grid.js';
import { Position } from '../../../primitives.js';
import InsightError from '../types/insightError.js';

export class Graph {
  public idToPositions = new Map<number, number[]>();
  public positionToId = new Map<number, number>();
  public adjacency = new Map<number, Set<number>>();

  private _articulationPoints?: Set<number>;
  private _shortestPaths = new Map<string, number[]>();

  public get articulationPoints(): Set<number> {
    this._articulationPoints ??= this.tarjanAlgorithm();
    return this._articulationPoints;
  }

  public constructor(protected grid: GridData) {
    this.grid = grid;
  }

  public createNode(): number {
    const id = this.idToPositions.size;
    this.idToPositions.set(id, []);
    this.adjacency.set(id, new Set<number>());
    this._articulationPoints = undefined;
    return id;
  }

  public addToNode(id: number, x: number, y: number): void {
    const positionValue = this.fromPosition(x, y);
    this.positionToId.set(positionValue, id);
    this.idToPositions.get(id)!.push(positionValue);
  }

  public getId(x: number, y: number): number {
    const id = this.positionToId.get(this.fromPosition(x, y));
    if (id === undefined) {
      throw new InsightError(
        'graph',
        `Cannot find position (${x}, ${y}) in the graph`
      );
    }
    return id;
  }

  public getPositions(id: number): Position[] {
    const positionValues = this.idToPositions.get(id);
    if (!positionValues) {
      throw new InsightError('graph', `Cannot find id ${id} in the graph`);
    }
    return positionValues.map(value => this.toPosition(value));
  }

  public connect(x1: number, y1: number, x2: number, y2: number): void {
    const id1 = this.getId(x1, y1);
    const id2 = this.getId(x2, y2);
    if (id1 === id2) return;
    this.adjacency.get(id1)!.add(id2);
    this.adjacency.get(id2)!.add(id1);
    this._articulationPoints = undefined;
  }

  public shortestPath(id1: number, id2: number): number[] {
    const key = id1 < id2 ? `${id1},${id2}` : `${id2},${id1}`;
    if (this._shortestPaths.has(key)) {
      return this._shortestPaths.get(key)!;
    }
    const path = this.aStar(id1, id2);
    this._shortestPaths.set(key, path);
    return path;
  }

  private fromPosition(x: number, y: number): number {
    return y * this.grid.width + x;
  }

  private toPosition(value: number): Position {
    return {
      x: value % this.grid.width,
      y: Math.floor(value / this.grid.width),
    };
  }

  private tarjanAlgorithm(): Set<number> {
    const visited = new Set<number>();
    const discoveryTime = new Map<number, number>();
    const lowTime = new Map<number, number>();
    const parent = new Map<number, number | null>();
    const articulationPoints = new Set<number>();
    let time = 0;

    const dfs = (u: number): void => {
      visited.add(u);
      discoveryTime.set(u, time);
      lowTime.set(u, time);
      time += 1;
      let children = 0;

      for (const v of this.adjacency.get(u)!) {
        if (!visited.has(v)) {
          children += 1;
          parent.set(v, u);
          dfs(v);
          lowTime.set(u, Math.min(lowTime.get(u)!, lowTime.get(v)!));

          if (parent.get(u) === null && children > 1) {
            articulationPoints.add(u);
          }
          if (
            parent.get(u) !== null &&
            lowTime.get(v)! >= discoveryTime.get(u)!
          ) {
            articulationPoints.add(u);
          }
        } else if (v !== parent.get(u)) {
          lowTime.set(u, Math.min(lowTime.get(u)!, discoveryTime.get(v)!));
        }
      }
    };

    for (const id of this.idToPositions.keys()) {
      if (!visited.has(id)) {
        parent.set(id, null);
        dfs(id);
      }
    }

    return articulationPoints;
  }

  private aStar(start: number, goal: number): number[] {
    const openSet = new Set<number>([start]);
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>([[start, 0]]);
    const fScore = new Map<number, number>([
      [start, this.heuristic(start, goal)],
    ]);

    while (openSet.size > 0) {
      let current: number | null = null;
      let lowestFScore = Infinity;
      for (const node of openSet) {
        const score = fScore.get(node) ?? Infinity;
        if (score < lowestFScore) {
          lowestFScore = score;
          current = node;
        }
      }

      if (current === goal) {
        const path: number[] = [];
        while (current !== undefined) {
          path.unshift(current);
          current = cameFrom.get(current)!;
        }
        return path;
      }

      openSet.delete(current!);
      for (const neighbor of this.adjacency.get(current!)!) {
        const tentativeGScore = (gScore.get(current!) ?? Infinity) + 1; // Assuming uniform cost
        if (tentativeGScore < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current!);
          gScore.set(neighbor, tentativeGScore);
          fScore.set(
            neighbor,
            tentativeGScore + this.heuristic(neighbor, goal)
          );
          if (!openSet.has(neighbor)) {
            openSet.add(neighbor);
          }
        }
      }
    }

    return []; // No path found
  }

  private heuristic(id1: number, id2: number): number {
    const pos1 = this.toPosition(id1);
    const pos2 = this.toPosition(id2);
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }
}
