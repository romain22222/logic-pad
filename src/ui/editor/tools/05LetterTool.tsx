import { memo } from 'react';
import SymbolTool from '../SymbolTool';
import { instance } from '../../../data/symbols/letterSymbol';
import LetterSymbol from '../../symbols/LetterSymbol';

const sample = instance;

export default memo(function LetterTool() {
  return <SymbolTool name="Letter" sample={sample} component={LetterSymbol} />;
});
