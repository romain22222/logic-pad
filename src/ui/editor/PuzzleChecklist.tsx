import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useEmbed } from '../EmbedContext';
import { useGrid } from '../GridContext';
import Accordion from '../components/Accordion';
import { useGridState } from '../GridStateContext';
import { Color, State } from '../../data/primitives';
import { BiSolidFlagCheckered } from 'react-icons/bi';
import { BsCreditCard2Front, BsPatchCheckFill } from 'react-icons/bs';
import { FaCircleHalfStroke } from 'react-icons/fa6';
import { MetadataSchema } from '../../data/puzzle';
import { RiRobot2Fill } from 'react-icons/ri';
import GridData from '../../data/grid';
import { HiViewGrid, HiViewGridAdd } from 'react-icons/hi';
import { IconBaseProps } from 'react-icons';
import { cn } from '../../utils';
import { useSolver } from '../SolverContext';
import { allSolvers } from '../../data/solver/allSolvers';
import { GoInfo } from 'react-icons/go';

function ChecklistItem({
  icon: Icon,
  iconClass,
  children,
  tooltip,
}: {
  icon: React.JSXElementConstructor<IconBaseProps>;
  iconClass: string;
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 tooltip tooltip-top tooltip-info"
      data-tip={tooltip}
    >
      <Icon size={22} className={iconClass} />
      {children}
    </div>
  );
}

interface TiedToGrid<T> {
  grid: GridData;
  value: T;
}

export default memo(function PuzzleChecklist() {
  const { features } = useEmbed();
  const { grid, metadata, setGrid } = useGrid();
  const { state } = useGridState();
  const { solver, setSolver } = useSolver();

  const [environmentCheck, setEnvironmentCheck] = useState<boolean | undefined>(
    undefined
  );
  const solverRequest = useRef(0);
  const [isPending, setPending] = useState(false);
  const [solution, setSolution] = useState<TiedToGrid<GridData | null> | null>(
    null
  );
  const [alternate, setAlternate] =
    useState<TiedToGrid<GridData | null> | null>(null);

  useEffect(() => {
    if (solution && !solution.grid.resetTiles().equals(grid.resetTiles())) {
      setSolution(null);
      setPending(false);
    }
    if (alternate && !alternate.grid.resetTiles().equals(grid.resetTiles())) {
      setAlternate(null);
      setPending(false);
    }
  }, [grid, solution, alternate]);

  useEffect(() => {
    setEnvironmentCheck(undefined);
  }, [solver]);

  const metadataValid = useMemo(
    () => MetadataSchema.safeParse(metadata).success,
    [metadata]
  );

  const autoValidation = useMemo(() => !grid.requireSolution(), [grid]);

  const solutionIsNotEmpty = useMemo(
    () =>
      grid.tiles.some(row =>
        row.some(tile => !tile.fixed && tile.color !== Color.Gray)
      ),
    [grid]
  );

  const solutionIsComplete = useMemo(() => grid.isComplete(), [grid]);

  const solutionIsValid = state.final !== State.Error;

  const autoSolvable = useMemo(
    () => solver.isGridSupported(grid),
    [solver, grid]
  );

  const checklistComplete =
    metadataValid &&
    (autoValidation
      ? solution !== null
        ? solution.value !== null
        : solutionIsComplete && solutionIsValid
      : solution !== null
        ? solution.value !== null
        : solutionIsNotEmpty);

  if (!features.checklist) return null;

  return (
    <Accordion
      title={
        <>
          <span>Checklist</span>
          {checklistComplete ? (
            <div className="badge badge-success ml-2">Complete</div>
          ) : (
            <div className="badge badge-error ml-2">Incomplete</div>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-2 text-sm">
        <ChecklistItem
          key="metadataValid"
          icon={BsCreditCard2Front}
          iconClass={metadataValid ? 'text-success' : 'text-error'}
          tooltip={
            metadataValid
              ? 'All required metadata fields are filled'
              : 'Fill all required metadata fields'
          }
        >
          {metadataValid ? 'Metadata valid' : 'Metadata invalid'}
        </ChecklistItem>
        <ChecklistItem
          key="autoValidation"
          icon={BiSolidFlagCheckered}
          iconClass={autoValidation ? 'text-success' : 'text-success/50'}
          tooltip={
            autoValidation
              ? 'You puzzle solution is automatically validated'
              : 'Only the solution you provide will be accepted'
          }
        >
          {autoValidation ? 'Auto validation' : 'Solution required'}
        </ChecklistItem>
        {autoValidation ? (
          <>
            <ChecklistItem
              key="solutionIsValid"
              icon={BsPatchCheckFill}
              iconClass={
                solutionIsValid && solutionIsComplete
                  ? 'text-success'
                  : 'text-error'
              }
              tooltip="A valid and complete solution is required to prove that the puzzle is solvable"
            >
              {solutionIsValid && solutionIsComplete
                ? 'Solution valid'
                : solutionIsValid
                  ? 'Solution incomplete'
                  : 'Solution invalid'}
            </ChecklistItem>
          </>
        ) : (
          <ChecklistItem
            key="solutionIsNotEmpty"
            icon={FaCircleHalfStroke}
            iconClass={solutionIsNotEmpty ? 'text-success' : 'text-error'}
            tooltip="Solution cannot be empty"
          >
            {solutionIsNotEmpty ? 'Solution not empty' : 'Solution empty'}
          </ChecklistItem>
        )}
        {solution !== null || isPending ? (
          <>
            <ChecklistItem
              key="solution"
              icon={HiViewGrid}
              iconClass={
                solution !== null
                  ? solution.value !== null
                    ? 'text-success'
                    : 'text-error'
                  : 'opacity-0'
              }
              tooltip={
                solution !== null
                  ? solution.value !== null
                    ? 'Solution found. Click to view'
                    : 'This puzzle has no solution'
                  : isPending
                    ? 'Solving...'
                    : 'Solver stopped before a solution was found'
              }
            >
              <span className="flex-1 text-start">
                {solution !== null
                  ? solution.value !== null
                    ? 'Solution found'
                    : 'No solution'
                  : isPending
                    ? 'Solving...'
                    : 'Solution unavailable'}
              </span>
              {!!solution?.value && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setGrid(solution.value!);
                    setSolution({
                      grid: solution.value!,
                      value: solution.value,
                    });
                    if (alternate) {
                      setAlternate({
                        grid: solution.value!,
                        value: alternate.value,
                      });
                    }
                  }}
                >
                  View
                </button>
              )}
            </ChecklistItem>
            {!!solution?.value && (
              <ChecklistItem
                key="alternate"
                icon={HiViewGridAdd}
                iconClass={
                  alternate !== null
                    ? alternate.value !== null
                      ? 'text-success/50'
                      : 'text-success'
                    : 'opacity-0'
                }
                tooltip={
                  alternate !== null
                    ? alternate.value !== null
                      ? 'Click to view alternate solution'
                      : 'The solution is unique'
                    : isPending
                      ? 'Looking for alternate solutions...'
                      : 'Alternate solution not supported by solver'
                }
              >
                <span className="flex-1 text-start">
                  {alternate !== null
                    ? alternate.value !== null
                      ? 'Solution not unique'
                      : 'Unique solution'
                    : isPending
                      ? 'Verifying...'
                      : 'Alternate unavailable'}
                </span>
                {!!alternate?.value && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setGrid(alternate.value!);
                      if (solution)
                        setSolution({
                          grid: alternate.value!,
                          value: solution.value,
                        });
                      setAlternate({
                        grid: alternate.value!,
                        value: alternate.value,
                      });
                    }}
                  >
                    View
                  </button>
                )}
              </ChecklistItem>
            )}
          </>
        ) : (
          <>
            <ChecklistItem
              key="autoSolvable"
              icon={RiRobot2Fill}
              iconClass={autoSolvable ? 'text-success' : 'text-success/50'}
              tooltip={
                autoSolvable
                  ? 'Can be solved automatically by the solver'
                  : 'Cannot be solved automatically'
              }
            >
              {autoSolvable ? 'Auto solvable' : 'Not auto solvable'}
            </ChecklistItem>
            <div
              className="tooltip tooltip-top tooltip-info"
              data-tip={
                environmentCheck === false
                  ? 'Your browser does not support the solver'
                  : 'This may take a while. Editing the puzzle will cancel the operation'
              }
            >
              <div className="flex gap-1 items-center">
                <button
                  className="btn btn-ghost p-1 min-h-0 h-fit shrink-0 flex gap-1 items-center"
                  onClick={() =>
                    (
                      document.getElementById(
                        'solverModel'
                      ) as HTMLDialogElement
                    ).showModal()
                  }
                >
                  Solver:
                  <GoInfo size={18} />
                </button>
                <dialog id="solverModel" className="modal">
                  <div className="modal-box">
                    <h3 className="font-bold text-xl">Available solvers</h3>
                    {[...allSolvers.values()].map(solver => (
                      <p key={solver.id} className="py-2 text-left">
                        <b className="text-lg">{solver.id}</b>
                        <br />
                        {solver.description}
                      </p>
                    ))}
                    <div className="modal-action">
                      <form method="dialog">
                        <button className="btn">Close</button>
                      </form>
                    </div>
                  </div>
                </dialog>
                <select
                  className="select select-bordered select-sm w-full max-w-xs"
                  value={solver.id}
                  onChange={e => setSolver(allSolvers.get(e.target.value)!)}
                >
                  {[...allSolvers.keys()].map(id => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <button
                  className={cn(
                    'btn btn-outline btn-info btn-sm',
                    environmentCheck === false && 'btn-error'
                  )}
                  onClick={async () => {
                    let support = environmentCheck;
                    if (support === undefined) {
                      support = await solver.isEnvironmentSupported();
                      setEnvironmentCheck(support);
                    }
                    if (!support) return;
                    const requestId = ++solverRequest.current;
                    setPending(true);
                    setSolution(null);
                    setAlternate(null);
                    try {
                      let isAlternate = false;
                      for await (const solution of solver.solve(grid)) {
                        if (!isAlternate) {
                          if (requestId !== solverRequest.current) break;
                          setSolution({ grid, value: solution });
                          isAlternate = true;
                        } else {
                          if (requestId !== solverRequest.current) break;
                          setAlternate({ grid, value: solution });
                          break;
                        }
                      }
                    } finally {
                      setPending(false);
                    }
                  }}
                  disabled={environmentCheck === false || !autoSolvable}
                >
                  Solve
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Accordion>
  );
});
