import { memo } from 'react';
import GridData from '../../data/grid';
import { Color } from '../../data/primitives';
import CanvasGrid from './canvasGrid/Grid';
import DOMGrid from './domGrid/Grid';

export interface GridProps {
  size: number;
  grid: GridData;
  editable: boolean;
  onTileClick?: (x: number, y: number, target: Color, flood: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export default memo(function Grid({
  type,
  ...props
}: GridProps & { type?: 'dom' | 'canvas' | 'auto' }) {
  type ??= 'auto';
  if (
    type === 'canvas' ||
    (type === 'auto' && props.grid.width * props.grid.height > 500)
  ) {
    return <CanvasGrid {...props} />;
  }
  return <DOMGrid {...props} />;
});
