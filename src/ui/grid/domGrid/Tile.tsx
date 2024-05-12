import { memo, useMemo } from 'react';
import TileData from '../../../data/tile';
import { cn } from '../../../utils';
import mouseContext from '../MouseContext';
import { Color } from '../../../data/primitives';
import TileConnections from '../../../data/tileConnections';
import { bg } from '../../helper';
import './tile.css';
import {
  BL,
  BR,
  TL,
  TR,
  connectionsToId,
  getEm,
  tileShapes,
} from '../tileInfo';

export interface TileProps {
  data: TileData;
  editable: boolean;
  connections: TileConnections;
  onTileClick?: (target: Color, flood: boolean) => void;
}

type TileStyles = {
  style: React.CSSProperties;
  fixable: boolean;
  focusable: boolean;
}[];

const tileStyles = Object.freeze(
  new Map<string, TileStyles>(
    [...tileShapes.entries()].map(([key, shape]) => {
      let focused = false;
      return [
        key,
        shape.map(part => ({
          style: {
            top: getEm(part.t).toString() + 'em',
            left: getEm(part.l).toString() + 'em',
            bottom: getEm(part.b).toString() + 'em',
            right: getEm(part.r).toString() + 'em',
            width: `${1 - getEm(part.l) - getEm(part.r)}em`,
            height: `${1 - getEm(part.t) - getEm(part.b)}em`,
            borderTopLeftRadius: part.corners & TL ? '0.125em' : 0,
            borderTopRightRadius: part.corners & TR ? '0.125em' : 0,
            borderBottomLeftRadius: part.corners & BL ? '0.125em' : 0,
            borderBottomRightRadius: part.corners & BR ? '0.125em' : 0,
          },
          fixable: part.b === 1 && part.l === 1 && part.r === 1 && part.t === 1,
          focusable:
            !focused && part.t <= 1 && part.r <= 1 && part.b <= 1 && part.l <= 1
              ? (focused = true)
              : false,
        })),
      ];
    })
  )
);

export default memo(function Tile({
  data,
  editable,
  connections,
  onTileClick,
}: TileProps) {
  const partStyles = useMemo(() => {
    const key = connectionsToId(connections);
    const styles = tileStyles.get(key);
    if (!styles) throw new Error(`No style for key ${key}`);
    return styles;
  }, [connections]);
  let fixed = false;

  return (
    <div className="relative w-[1em] h-[1em] logic-tile">
      {data.exists && (
        <>
          {partStyles.map(({ style, fixable, focusable }, i) => (
            <button
              key={i}
              className={cn(
                'absolute btn no-animation transition-none duration-0 p-0 shadow-none min-h-0 text-[1em]',
                bg(data.color),
                editable ? 'cursor-pointer' : 'cursor-default',
                fixable && data.fixed
                  ? ((fixed = true), 'tile-fixed')
                  : 'border-0'
              )}
              tabIndex={
                editable && !data.fixed && focusable ? 0 : -1 // dirty hack to make only the central button focusable
              }
              style={style}
              onPointerDown={e => {
                e.preventDefault();
                if (!editable) return;
                if (e.pointerType === 'mouse') {
                  let c = mouseContext.getColorForButtons(e.buttons);
                  if (!c) {
                    mouseContext.setColor(null, false);
                  } else {
                    if (c === data.color) c = Color.Gray;
                    mouseContext.setColor(
                      c,
                      c !== Color.Gray && data.color !== Color.Gray
                    );
                    onTileClick?.(c, e.ctrlKey);
                  }
                }
              }}
              onPointerUp={e => {
                e.preventDefault();
                if (!editable) return;
                mouseContext.setColor(null, false);
                if (e.pointerType !== 'mouse') {
                  let c = mouseContext.getColorForButtons(1);
                  if (c) {
                    if (c === data.color) c = Color.Gray;
                    onTileClick?.(c, e.ctrlKey);
                  }
                }
              }}
              onPointerEnter={e => {
                e.preventDefault();
                if (!editable) return;
                const c = mouseContext.getColorForButtons(e.buttons);
                if (
                  !c ||
                  !mouseContext.color ||
                  (c !== mouseContext.color &&
                    mouseContext.color !== Color.Gray)
                ) {
                  mouseContext.setColor(null, false);
                } else {
                  if (mouseContext.color === data.color) return;
                  if (
                    mouseContext.color === Color.Gray ||
                    data.color === Color.Gray ||
                    mouseContext.replacing
                  )
                    onTileClick?.(mouseContext.color, e.ctrlKey);
                }
              }}
            ></button>
          ))}
          {!fixed && data.fixed && (
            <div
              key="fixed"
              className="absolute inset-[0.05em] text-[1em] pointer-events-none tile-fixed"
            ></div>
          )}
        </>
      )}
    </div>
  );
});
