import { memo, useEffect, useRef, useState } from 'react';
import GridOverlay from './GridOverlay';
import { Layer, Stage } from 'react-konva';

export interface GridCanvasOverlayProps {
  width: number;
  height: number;
  bleed?: number;
  children?: (tileSize: number) => React.ReactNode;
}

export default memo(function GridCanvasOverlay({
  width,
  height,
  bleed,
  children,
}: GridCanvasOverlayProps) {
  bleed ??= 0;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState(0);

  useEffect(() => {
    if (overlayRef.current) {
      const { current } = overlayRef;
      const resizeHandler = () => {
        const divWidth = current.offsetWidth;
        setTileSize(divWidth / width);
      };
      resizeHandler();
      const observer = new ResizeObserver(resizeHandler);
      observer.observe(current);
      return () => observer.disconnect();
    }
  }, [width]);

  return (
    <GridOverlay ref={overlayRef}>
      <Stage
        width={width * tileSize + bleed * 2}
        height={height * tileSize + bleed * 2}
        style={{ top: -bleed, left: -bleed }}
        className="absolute"
      >
        <Layer offsetX={-bleed} offsetY={-bleed}>
          {children?.(tileSize)}
        </Layer>
      </Stage>
    </GridOverlay>
  );
});
