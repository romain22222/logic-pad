import { array } from '../../../dataHelper.js';
import { Color, Position } from '../../../primitives.js';
import Symbol from '../../../symbols/symbol.js';
import InsightContext from '../insightContext.js';
import InsightStore from './insightStore.js';

export class Area {
  public constructor(
    public readonly id: number,
    public readonly color: Color,
    public readonly positions: Position[] = [],
    public readonly symbols: Symbol[] = []
  ) {
    this.id = id;
    this.color = color;
    this.positions = positions;
    this.symbols = symbols;
  }

  public copy(): Area {
    return new Area(
      this.id,
      this.color,
      this.positions.slice(),
      this.symbols.slice()
    );
  }
}

export default class AreaStore extends InsightStore {
  public readonly id = 'area';

  private _cells: (Area | null)[][] = [];
  private _areaList: Area[] = [];

  public constructor(context: InsightContext) {
    super(context);
    this.recompute();
  }

  public get cells(): readonly (readonly (Area | null)[])[] {
    return this._cells;
  }

  public get areaList(): readonly Area[] {
    return this._areaList;
  }

  public get(position: Position | number): Area | null {
    if (typeof position === 'number') {
      const x = position % this.context.grid.width;
      const y = Math.floor(position / this.context.grid.width);
      return this._cells[y][x];
    } else {
      return this._cells[position.y][position.x];
    }
  }

  public onGridUpdate(): void {
    this.recompute();
  }

  public copyWithContext(context: InsightContext): this {
    const copy = new AreaStore(context);
    copy._cells = this._cells.map(row =>
      row.map(cell => (cell ? cell.copy() : null))
    );
    copy._areaList = this._areaList.map(area => area.copy());
    return copy as this;
  }

  private recompute() {
    const grid = this.context.grid;
    const newCells: (Area | null)[][] = array(
      grid.width,
      grid.height,
      () => null
    );
    const newAreaList: Area[] = [];
    const visited = array(grid.width, grid.height, () => false);
    while (true) {
      const seed = grid.find((t, x, y) => !visited[y][x] && t.exists);
      if (!seed) break;
      const seedTile = grid.getTile(seed.x, seed.y);
      if (seedTile.color === Color.Gray) {
        visited[seed.y][seed.x] = true;
        const area = new Area(this.toCellValue(seed.x, seed.y), Color.Gray, [
          seed,
        ]);
        newCells[seed.y][seed.x] = area;
        newAreaList.push(area);
        continue;
      } else {
        const area = new Area(
          this.toCellValue(seed.x, seed.y),
          seedTile.color,
          [],
          []
        );
        grid.iterateArea(
          seed,
          t => t.exists && t.color === seedTile.color,
          (_, x, y) => {
            visited[y][x] = true;
            area.positions.push({ x, y });
            newCells[y][x] = area;
          }
        );
        newAreaList.push(area);
      }
    }
    for (const [_, symbols] of grid.symbols.entries()) {
      for (const symbol of symbols) {
        const x = Math.floor(symbol.x);
        const y = Math.floor(symbol.y);
        const area = newCells[y][x];
        if (area) {
          area.symbols.push(symbol);
        }
      }
    }
    this._cells = newCells;
    this._areaList = newAreaList;
  }

  private toCellValue(x: number, y: number): number {
    return y * this.context.grid.width + x;
  }
}
