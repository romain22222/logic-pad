import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { memo } from 'react';
import useLinkLoader, {
  SolutionBehavior,
  validateSearch,
} from '../ui/router/linkLoader';
import PuzzleEditor from '../ui/editor/PuzzleEditor';
import { IoWarningOutline } from 'react-icons/io5';

export const Route = createFileRoute('/_layout/create')({
  validateSearch,
  component: memo(function CreateMode() {
    const params = Route.useSearch();
    const navigate = useNavigate();
    const linkResult = useLinkLoader(params, true, SolutionBehavior.Remove);

    return (
      <PuzzleEditor>
        {linkResult && linkResult.solutionStripped && (
          <div
            className="tooltip tooltip-top tooltip-info flex shrink-0"
            data-tip="The puzzle solution has been removed to avoid spoiling the puzzle. Click to reload the puzzle with its original solution."
          >
            <div role="alert" className="alert shadow-lg gap-2">
              <IoWarningOutline className="text-warning" size={24} />
              <div>
                <h3 className="font-bold">Solution removed</h3>
                <div className="text-xs">Click to load original puzzle</div>
              </div>
              <button
                className="btn btn-sm btn-warning"
                onClick={() =>
                  navigate({
                    to: '/solve',
                    search: linkResult.originalParams,
                  })
                }
              >
                Load
              </button>
            </div>
          </div>
        )}
      </PuzzleEditor>
    );
  }),
});