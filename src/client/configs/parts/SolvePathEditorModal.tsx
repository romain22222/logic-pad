import { memo, useEffect } from 'react';
import GridData from '@logic-pad/core/data/grid';
import { cn } from '../../uiHelper';
import EmbedContext, { useEmbed } from '../../contexts/EmbedContext';
import GridContext, { GridConsumer, useGrid } from '../../contexts/GridContext';
import DisplayContext from '../../contexts/DisplayContext';
import EditContext from '../../contexts/EditContext';
import GridStateContext from '../../contexts/GridStateContext';
import { Position } from '@logic-pad/core/data/primitives';
import DocumentTitle from '../../components/DocumentTitle';
import ThreePaneLayout from '../../components/ThreePaneLayout';
import TouchControls from '../../components/TouchControls';
import MainGrid from '../../grid/MainGrid';
import InstructionList from '../../instructions/InstructionList';
import InstructionPartOutlet from '../../instructions/InstructionPartOutlet';
import { PartPlacement } from '../../instructions/parts/types';
import Metadata from '../../metadata/Metadata';
import PerfectionRule from '@logic-pad/core/data/rules/perfectionRule';

export interface SolvePathEditorModalProps {
  solvePath: Position[];
  setSolvePath: (solvePath: Position[]) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

function EmbedLoader({ grid }: { grid: GridData }) {
  const { setFeatures } = useEmbed();
  const { setGrid } = useGrid();
  useEffect(() => {
    setFeatures({
      instructions: false,
      metadata: false,
      checklist: false,
    });
    setGrid(
      grid.withRules(rules => [new PerfectionRule(), ...rules]),
      null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default memo(function SolvePathEditorModal({
  open,
  setOpen,
}: SolvePathEditorModalProps) {
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
              <EmbedContext>
                <DisplayContext>
                  <EditContext>
                    <GridStateContext>
                      <GridContext>
                        <EmbedLoader grid={outerGrid} />
                        <ThreePaneLayout
                          left={
                            <>
                              <DocumentTitle>Logic Pad</DocumentTitle>
                              <div className="flex flex-col gap-2 justify-self-stretch flex-1 justify-center">
                                <Metadata />
                                <InstructionPartOutlet
                                  placement={PartPlacement.LeftPanel}
                                />
                              </div>
                              <InstructionPartOutlet
                                placement={PartPlacement.LeftBottom}
                              />
                              <TouchControls />
                            </>
                          }
                          center={<MainGrid useToolboxClick={false} />}
                          right={<InstructionList />}
                        />
                      </GridContext>
                    </GridStateContext>
                  </EditContext>
                </DisplayContext>
              </EmbedContext>
            )}
          </GridConsumer>
        )}
      </div>
      <form method="dialog" className="modal-backdrop bg-neutral/55"></form>
    </dialog>
  );
});

export const type = undefined;
