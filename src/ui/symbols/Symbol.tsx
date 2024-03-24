import allSymbols, { SymbolProps } from '../../allSymbols';
import SymbolData from '../../data/symbols/symbol';
import { memo, useMemo } from 'react';

export default memo(function Symbol({
  textClass,
  symbol,
}: SymbolProps<SymbolData>) {
  const containerStyle = useMemo(
    () => ({
      top: `calc(${symbol.y} * 1em)`,
      left: `calc(${symbol.x} * 1em)`,
    }),
    [symbol.x, symbol.y]
  );
  const Component = allSymbols.get(symbol.id);
  if (!Component) {
    throw new Error(`No component for symbol: ${symbol.id}`);
  }
  return (
    <div className="absolute w-[1em] h-[1em]" style={containerStyle}>
      <Component textClass={textClass} symbol={symbol} />
    </div>
  );
});
