import { memo } from 'react';
import { instance } from '../../../data/symbols/minesweeperSymbol';
import SymbolTool from '../SymbolTool';
import MinesweeperSymbol from '../../symbols/MinesweeperSymbol';

const sample = instance;

export default memo(function MinesweeperTool() {
  return (
    <SymbolTool
      name="Minesweeper Number"
      sample={sample}
      component={MinesweeperSymbol}
    />
  );
});
