import { Color, Position } from '../../../primitives.js';
import Proof from '../types/proof.js';
import DisjointSet from './disjointSet.js';
import InsightStore from './insightStore.js';
import type InsightContext from '../insightContext.js';
import { cell, region } from '../helper.js';
import { RegionGraph } from './regionGraph.js';
import { array } from '../../../dataHelper.js';
import Symbol from '../../../symbols/symbol.js';

export type RegionMap = (boolean | null)[][];

export class Region {
  public constructor(
    protected readonly context: InsightContext,
    public readonly id: number,
    public color: Color,
    public positions: Position[] = [],
    public symbols: Symbol[] = [],
    public connectedAreas = new Set<number>(),
    public connectionProofs = new Set<Proof>()
  ) {
    this.context = context;
    this.id = id;
    this.color = color;
    this.positions = positions;
    this.symbols = symbols;
    this.connectedAreas = connectedAreas;
    this.connectionProofs = connectionProofs;
  }

  public static merge(
    regionA: Region,
    regionB: Region,
    id: number,
    proof?: Proof
  ): Region {
    if (
      regionA.color !== Color.Gray &&
      regionB.color !== Color.Gray &&
      regionA.color !== regionB.color
    ) {
      throw new Error(
        `Cannot merge regions ${regionA.id} and ${regionB.id}: they are different colors.`
      );
    }

    return new Region(
      regionA.context,
      id,
      regionA.color === Color.Gray ? regionB.color : regionA.color,
      [...regionA.positions, ...regionB.positions],
      [...regionA.symbols, ...regionB.symbols],
      new Set([...regionA.connectedAreas, ...regionB.connectedAreas]),
      new Set([
        ...regionA.connectionProofs,
        ...regionB.connectionProofs,
        ...(proof ? [proof] : []),
      ])
    );
  }

  private _regionMap?: RegionMap;
  /**
   * Get a map of cells that are in the same region as the given cell (`true`), in a different region (`false`), or unknown
   * but possible (`null`). Includes deductions from lemmas.
   */
  public get regionMap(): RegionMap {
    if (!this._regionMap) {
      this._regionMap = this.buildRegionMap();
    }
    return this._regionMap;
  }

  private buildRegionMap(): RegionMap {
    const grid = this.context.grid;
    const map: RegionMap = array(grid.width, grid.height, () => null);
    if (this.color !== Color.Gray) {
      grid.iterateArea(
        this.positions[0],
        t => t.color === this.color || t.color === Color.Gray,
        (_, x, y) => {
          map[y][x] = null;
        }
      );
    } else {
      grid.iterateArea(
        this.positions[0],
        t => t.color === Color.Light || t.color === Color.Gray,
        (_, x, y) => {
          map[y][x] = null;
        }
      );
      grid.iterateArea(
        this.positions[0],
        t => t.color === Color.Dark || t.color === Color.Gray,
        (_, x, y) => {
          map[y][x] = null;
        }
      );
    }
    this.positions.forEach(pos => {
      map[pos.y][pos.x] = true;
    });
    const disconnections = this.context.regions.getDisconnectedRegions(
      this.positions[0]
    );
    disconnections.forEach(regionId => {
      const otherRegion = this.context.regions.regions.get(regionId);
      if (!otherRegion) return;
      otherRegion.positions.forEach(pos => {
        map[pos.y][pos.x] = false;
      });
    });
    return map;
  }

  private _regionGraph?: RegionGraph;
  /**
   * Get a graph representation of the region map for related computations.
   */
  public get regionGraph(): RegionGraph {
    if (!this._regionGraph) {
      this._regionGraph = this.buildRegionGraph();
    }
    return this._regionGraph;
  }

  private buildRegionGraph(): RegionGraph {
    const grid = this.context.grid;
    const graph = new RegionGraph(grid);
    const regionMap = this.regionMap;
    const visited = array(grid.width, grid.height, () => false);
    for (let y = 0; y < regionMap.length; y++) {
      for (let x = 0; x < regionMap[y].length; x++) {
        if (regionMap[y][x] === false) continue;
        if (visited[y][x]) continue;
        const id = graph.createNode();
        const connected = grid.connections.getConnectedTiles({ x, y });
        for (const tile of connected) {
          if (regionMap[tile.y][tile.x] === false) continue;
          visited[tile.y][tile.x] = true;
          graph.addToNode(id, tile.x, tile.y);
        }
      }
    }

    for (let y = 0; y < regionMap.length; y++) {
      for (let x = 0; x < regionMap[y].length; x++) {
        if (regionMap[y][x] === false) continue;
        if (x < regionMap[y].length - 1 && regionMap[y][x + 1] !== false) {
          graph.connect(x, y, x + 1, y);
        }
        if (y < regionMap.length - 1 && regionMap[y + 1][x] !== false) {
          graph.connect(x, y, x, y + 1);
        }
      }
    }

    return graph;
  }
}

/**
 * Tracks the formation of regions by connecting areas together based on logical deductions.
 *
 * Note on terminology:
 * - **Areas** refer to a group of orthogonally same-color non-gray tiles on the grid. Each area has a unique ID and
 * an associated `Area` object in `AreaInfoStore`.
 * - **Regions** refer to a group of connected areas based on logical deductions. Each region is represented by the ID
 * of the representative area. The representative area is determined by the `disjointSet` in this store.
 */
export default class RegionStore extends InsightStore {
  /**
   * Tracks which **areas** are connected into regions based on logical deductions. Each region is represented by the ID
   * of the representative area in `AreaInfoStore`.
   */
  private disjointSet = new DisjointSet(0);
  /**
   * Connections between **areas** represented by area ID pairs.
   * This must not include entries connecting two cells in the same area, aka redundant connections.
   */
  private connectionProofs = new Map<string, Proof>();
  /**
   * Deductions that two **regions** are disconnected, keyed by representative area ID pairs.
   */
  private disconnectionProofs = new Map<string, Proof>();
  /**
   * Stores physical disconnections between two **regions**, keyed by representative area ID pairs.
   */
  private physicalDisconnections = new Set<string>();
  /**
   * Stores all regions.
   */
  private _regions = new Map<number, Region>();

  public readonly id = 'region';

  public constructor(context: InsightContext, initialize = true) {
    super(context);
    if (initialize) {
      this.recompute();
    }
  }

  public get regions(): ReadonlyMap<number, Region> {
    return this._regions;
  }

  public get(position: Position | number): Region | null {
    const area = this.context.areas.get(position);
    if (!area) return null;
    const rep = this.disjointSet.find(area.id);
    return this._regions.get(rep) ?? null;
  }

  /**
   * Recompute all connectivity information based on the current grid state.
   */
  public onGridUpdate(): void {
    this.recompute();
  }

  public copyWithContext(context: InsightContext): this {
    const copy = new RegionStore(context, false) as this;
    copy.disjointSet = this.disjointSet.copy();
    copy.connectionProofs = new Map(this.connectionProofs);
    copy.disconnectionProofs = new Map(this.disconnectionProofs);
    copy.physicalDisconnections = new Set(this.physicalDisconnections);
    copy._regions = new Map(this._regions);
    return copy;
  }

  /**
   * Checks whether two cells are connected, including lemma deductions.
   */
  public isConnected(cellA: Position, cellB: Position, proof?: Proof): boolean {
    const repA = this.context.areas.get(cellA);
    const repB = this.context.areas.get(cellB);

    if (!repA || !repB) return false;
    if (repA === repB) return true;
    if (
      repA.color !== Color.Gray &&
      repB.color !== Color.Gray &&
      repA.color !== repB.color
    )
      return false;

    const key = this.pairKey(repA.id, repB.id);
    const deduction = this.connectionProofs.get(key);
    if (deduction) {
      proof?.add(deduction);
      return true;
    }

    const regionRepA = this.disjointSet.find(repA.id);
    const regionRepB = this.disjointSet.find(repB.id);
    if (regionRepA === regionRepB) {
      const region = this._regions.get(regionRepA);
      if (region) {
        for (const regionProof of region.connectionProofs) {
          proof?.add(regionProof);
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Checks whether two cells are disconnected, including lemma deductions.
   */
  public isDisconnected(
    cellA: Position,
    cellB: Position,
    proof?: Proof
  ): boolean {
    const repA = this.context.areas.get(cellA);
    const repB = this.context.areas.get(cellB);

    if (!repA || !repB) return true;
    if (repA === repB) return false;
    if (
      repA.color !== Color.Gray &&
      repB.color !== Color.Gray &&
      repA.color !== repB.color
    )
      return true;

    const regionRepA = this.disjointSet.find(repA.id);
    const regionRepB = this.disjointSet.find(repB.id);
    if (regionRepA === regionRepB) return false;

    const key = this.pairKey(regionRepA, regionRepB);
    if (this.physicalDisconnections.has(key)) {
      return true;
    }
    const deduction = this.disconnectionProofs.get(key);
    if (deduction) {
      proof?.add(deduction);
      return true;
    }

    return false;
  }

  /**
   * Gets the list of regions that are disconnected from the given cell.
   */
  public getDisconnectedRegions(
    cell: Position,
    proof?: Proof
  ): ReadonlySet<number> {
    const region = this.get(cell);
    if (!region) return new Set();

    const disconnected = new Set<number>();
    for (const [key, deduction] of this.disconnectionProofs.entries()) {
      const [rawA, rawB] = this.fromPairKey(key);
      if (rawA !== region.id && rawB !== region.id) continue;
      const otherRegionId = rawA === region.id ? rawB : rawA;
      proof?.add(deduction);
      disconnected.add(otherRegionId);
    }
    for (const key of this.physicalDisconnections) {
      const [rawA, rawB] = this.fromPairKey(key);
      if (rawA !== region.id && rawB !== region.id) continue;
      const otherRegionId = rawA === region.id ? rawB : rawA;
      disconnected.add(otherRegionId);
    }
    return disconnected;
  }

  /**
   * Records a logical connection between two regions. Returns true if the connection was successfully recorded.
   */
  public addConnected(cellA: Position, cellB: Position, proof: Proof): boolean {
    const repA = this.context.areas.get(cellA);
    const repB = this.context.areas.get(cellB);

    if (!repA || !repB) {
      throw this.error(
        `Cannot connect ${cell(cellA)} and ${cell(cellB)}: one or both cells do not exist`
      );
    }
    if (repA === repB) return false;
    if (
      repA.color !== Color.Gray &&
      repB.color !== Color.Gray &&
      repA.color !== repB.color
    ) {
      throw this.error(
        `Cannot connect ${cell(cellA)} and ${cell(cellB)}: they are different colors.`
      );
    }

    const areaKey = this.pairKey(repA.id, repB.id);
    const existing = this.connectionProofs.get(areaKey);
    if (existing) {
      return false;
    }

    const regionRepA = this.disjointSet.find(repA.id);
    const regionRepB = this.disjointSet.find(repB.id);
    const regionA = this._regions.get(regionRepA)!;
    const regionB = this._regions.get(regionRepB)!;

    if (
      regionA.color !== Color.Gray &&
      regionB.color !== Color.Gray &&
      regionA.color !== regionB.color
    ) {
      throw this.error(
        `Cannot connect ${region(cellA)} and ${region(cellB)}: they are different colors.`
      );
    }

    const regionKey = this.pairKey(regionRepA, regionRepB);
    const disconnected = this.disconnectionProofs.get(regionKey);
    if (disconnected || this.physicalDisconnections.has(regionKey)) {
      throw this.error(
        `Cannot connect ${region(cellA)} and ${region(cellB)}: they are already known to be disconnected.`
      );
    }

    this.connectionProofs.set(areaKey, proof);

    if (regionRepA === regionRepB) {
      // The regions were already transitively connected, so we just need to add the proof to the region proofs.
      const region = this._regions.get(regionRepA);
      region!.connectionProofs.add(proof);
      return true;
    }

    this.disjointSet.union(regionRepA, regionRepB);
    const newRep = this.disjointSet.find(regionRepA);
    const newRegion = Region.merge(regionA, regionB, newRep, proof);
    this._regions.set(newRep, newRegion);
    this._regions.delete(regionRepA);
    this._regions.delete(regionRepB);
    return true;
  }

  /**
   * Records a logical disconnection between two regions. Returns true if the disconnection was successfully recorded.
   */
  public addDisconnected(
    cellA: Position,
    cellB: Position,
    proof: Proof
  ): boolean {
    const repA = this.context.areas.get(cellA);
    const repB = this.context.areas.get(cellB);

    if (!repA || !repB) return false;
    if (repA === repB) {
      throw this.error(
        `Cannot disconnect ${cell(cellA)} and ${cell(cellB)}: they are in the same area.`
      );
    }
    if (
      repA.color !== Color.Gray &&
      repB.color !== Color.Gray &&
      repA.color !== repB.color
    ) {
      return false;
    }

    const regionRepA = this.disjointSet.find(repA.id);
    const regionRepB = this.disjointSet.find(repB.id);

    if (regionRepA === regionRepB) {
      throw this.error(
        `Cannot disconnect ${region(cellA)} and ${region(cellB)}: they are already known to be connected.`
      );
    }

    const regionA = this._regions.get(regionRepA)!;
    const regionB = this._regions.get(regionRepB)!;

    if (
      regionA.color !== Color.Gray &&
      regionB.color !== Color.Gray &&
      regionA.color !== regionB.color
    ) {
      return false;
    }

    const regionKey = this.pairKey(regionRepA, regionRepB);
    const disconnected = this.disconnectionProofs.get(regionKey);
    if (disconnected || this.physicalDisconnections.has(regionKey)) {
      return false;
    }

    this.disconnectionProofs.set(regionKey, proof);
    return true;
  }

  private recompute(): void {
    const grid = this.context.grid;
    const size = grid.width * grid.height;
    this.disjointSet = new DisjointSet(size);
    this._regions.clear();

    for (const [key] of this.connectionProofs.entries()) {
      const [rawA, rawB] = this.fromPairKey(key);
      this.disjointSet.union(rawA, rawB);
    }

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const area = this.context.areas.get(this.toCellValue(x, y));
        if (!area) continue;
        const rep = this.disjointSet.find(area.id);
        let region = this._regions.get(rep);
        if (!region) {
          region = new Region(this.context, rep, area.color);
          this._regions.set(rep, region);
        }
        if (region.color === Color.Gray && area.color !== Color.Gray) {
          region.color = area.color;
        }
        region.positions.push(...area.positions);
        region.connectedAreas.add(area.id);
        region.symbols.push(...area.symbols);
      }
    }

    this.connectionProofs = this.rekeyConnectionProofs();
    this.disconnectionProofs = this.rekeyDisconnectionProofs();

    for (const [key, proof] of this.connectionProofs.entries()) {
      const [rawA] = this.fromPairKey(key);
      const repA = this.disjointSet.find(rawA);
      const region = this._regions.get(repA);
      if (region) {
        region.connectionProofs.add(proof);
      }
    }

    this.physicalDisconnections = this.buildPhysicalDisconnections();
  }

  private rekeyConnectionProofs(): Map<string, Proof> {
    const rekeyedConnectionProofs = new Map<string, Proof>();
    for (const [key, proof] of this.connectionProofs.entries()) {
      const [rawA, rawB] = this.fromPairKey(key);
      const areaA = this.context.areas.get(rawA);
      const areaB = this.context.areas.get(rawB);
      if (!areaA || !areaB) {
        throw this.error(
          `Invalid connection proof between ${cell(this.fromCellValue(rawA))} and ${cell(
            this.fromCellValue(rawB)
          )}: one or both areas do not exist.`
        );
      }
      if (areaA.id === areaB.id) continue;
      const regionKey = this.pairKey(areaA.id, areaB.id);
      if (!rekeyedConnectionProofs.has(regionKey))
        rekeyedConnectionProofs.set(regionKey, proof);
    }
    return rekeyedConnectionProofs;
  }

  private rekeyDisconnectionProofs(): Map<string, Proof> {
    const rekeyedDisconnectionProofs = new Map<string, Proof>();
    for (const [key, proof] of this.disconnectionProofs.entries()) {
      const [rawA, rawB] = this.fromPairKey(key);
      const areaA = this.context.areas.get(rawA);
      const areaB = this.context.areas.get(rawB);
      if (!areaA || !areaB) {
        throw this.error(
          `Invalid disconnection proof between ${cell(this.fromCellValue(rawA))} and ${cell(
            this.fromCellValue(rawB)
          )}: one or both areas do not exist.`
        );
      }
      const regionA = this.disjointSet.find(areaA.id);
      const regionB = this.disjointSet.find(areaB.id);
      const regionKey = this.pairKey(regionA, regionB);
      if (!rekeyedDisconnectionProofs.has(regionKey))
        rekeyedDisconnectionProofs.set(regionKey, proof);
    }
    return rekeyedDisconnectionProofs;
  }

  private buildPhysicalDisconnections(): Set<string> {
    const grid = this.context.grid;
    const disconnections = new Set<string>();
    const regions = Array.from(this._regions.values());
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      if (region.color === Color.Gray) continue;
      const visited = array(grid.width, grid.height, () => false);
      grid.iterateArea(
        region.positions[0],
        t => t.color === region.color || t.color === Color.Gray,
        (_, x, y) => {
          visited[y][x] = true;
        }
      );
      for (let j = i + 1; j < regions.length; j++) {
        const other = regions[j];
        if (other.color !== Color.Gray && other.color !== region.color)
          continue;
        const pos = other.positions[0];
        if (visited[pos.y][pos.x]) continue;
        const key = this.pairKey(region.id, other.id);
        disconnections.add(key);
      }
    }
    return disconnections;
  }

  private toCellValue(x: number, y: number): number {
    return y * this.context.grid.width + x;
  }

  private fromCellValue(value: number): Position {
    const x = value % this.context.grid.width;
    const y = Math.floor(value / this.context.grid.width);
    return { x, y };
  }

  private pairKey(valueA: number, valueB: number): string {
    if (valueA < valueB) return `${valueA},${valueB}`;
    return `${valueB},${valueA}`;
  }

  private fromPairKey(key: string): [number, number] {
    const [rawA, rawB] = key.split(',').map(value => Number.parseInt(value));
    if (!Number.isFinite(rawA) || !Number.isFinite(rawB)) {
      throw this.error('Invalid pair key: ' + key);
    }
    return [rawA, rawB];
  }
}
