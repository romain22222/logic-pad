import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import GridData from '@logic-pad/core/data/grid';
import { cn } from '../../../client/uiHelper.ts';
import EmbedContext from '../../contexts/EmbedContext.tsx';
import PuzzleEditorScreen from '../../screens/PuzzleEditorScreen.tsx';
import GridContext, {
  GridConsumer,
  defaultGrid,
} from '../../contexts/GridContext.tsx';
import DisplayContext from '../../contexts/DisplayContext.tsx';
import EditContext from '../../contexts/EditContext.tsx';
import GridStateContext from '../../contexts/GridStateContext.tsx';
import { useDelta } from 'react-delta-hooks';

export interface GridEditorModalProps {
  onChange: (grid: GridData) => void;
}

export interface GridEditorRef {
  open: (grid: GridData) => void;
}

export default memo(
  forwardRef<GridEditorRef, GridEditorModalProps>(function GridEditorModal(
    { onChange }: GridEditorModalProps,
    ref
  ) {
    const [open, setOpen] = useState(false);
    const [tempGrid, setTempGrid] = useState<GridData>(defaultGrid);

    useImperativeHandle(ref, () => ({
      open: (grid: GridData) => {
        setTempGrid(grid);
        setOpen(true);
      },
    }));

    const openDelta = useDelta(open);
    useEffect(() => {
      if (!openDelta) return;
      if (openDelta.prev && !openDelta.curr) {
        onChange(tempGrid);
      }
    }, [onChange, openDelta, tempGrid]);

    return (
      <dialog id="gridModal" className={cn('modal', open && 'modal-open')}>
        <div className="modal-box w-[calc(100%-4rem)] h-full max-w-none bg-neutral text-neutral-content">
          <form method="dialog">
            <button
              aria-label="Close dialog"
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </form>
          {open && (
            <GridConsumer>
              {({ grid: outerGrid }) => (
                <EmbedContext
                  name="grid-modal"
                  features={() => ({
                    instructions: false,
                    metadata: false,
                    checklist: false,
                  })}
                >
                  <DisplayContext>
                    <EditContext>
                      <GridStateContext>
                        <GridContext grid={tempGrid} setGrid={setTempGrid}>
                          <PuzzleEditorScreen>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setTempGrid(outerGrid);
                              }}
                            >
                              Copy from main grid
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                setOpen(false);
                              }}
                            >
                              Save and exit
                            </button>
                          </PuzzleEditorScreen>
                        </GridContext>
                      </GridStateContext>
                    </EditContext>
                  </DisplayContext>
                </EmbedContext>
              )}
            </GridConsumer>
          )}
        </div>
      </dialog>
    );
  })
);

export const type = undefined;
