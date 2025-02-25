import { memo } from 'react';
import SymbolTool from '../SymbolTool';
import { instance } from '@logic-pad/core/data/symbols/customIconSymbol';
import CustomIconSymbol from '../../symbols/CustomIconSymbol';

const sample = instance;

export default memo(function CustomIconTool() {
  return (
    <SymbolTool
      name="Custom Icon"
      order={16}
      hotkey="0"
      defaultHidden={true}
      sample={sample}
      component={CustomIconSymbol}
    />
  );
});
