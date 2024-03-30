import { useNavigate, useRouterState } from '@tanstack/react-router';
import { memo, useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import GridData from '../data/grid';
import GridConnections from '../data/gridConnections';
import BanPatternRule from '../data/rules/banPatternRule';
import CompletePatternRule from '../data/rules/completePatternRule';
import ConnectAllRule from '../data/rules/connectAllRule';
import CustomRule from '../data/rules/customRule';
import { Color } from '../data/primitives';
import UndercluedRule from '../data/rules/undercluedRule';
import LetterSymbol from '../data/symbols/letterSymbol';
import NumberSymbol from '../data/symbols/numberSymbol';
import ViewpointSymbol from '../data/symbols/viewpointSymbol';
import Puzzle, { PuzzleSchema } from '../data/puzzle';
import Compressor from '../data/serializer/compressor/allCompressors';
import Serializer from '../data/serializer/allSerializers';
import RegionAreaRule from '../data/rules/regionAreaRule';
import { ZodError } from 'zod';
import Tile from './grid/Tile';
import TileConnections from '../data/tileConnections';

const enclosure = [
  ['GridData', GridData, `GridData.create(['nnnnn', 'nnnnn'])`],
  [
    'GridConnections',
    GridConnections,
    `.withConnections(\n  GridConnections.create(['..aa.', '..aa.'])\n)`,
  ],
  ['TileConnections', TileConnections, null],
  ['Tile', Tile, null],
  [
    'BanPatternRule',
    BanPatternRule,
    '.addRule(new BanPatternRule(GridData.create([])))',
  ],
  [
    'CompletePatternRule',
    CompletePatternRule,
    '.addRule(new CompletePatternRule())',
  ],
  [
    'ConnectAllRule',
    ConnectAllRule,
    '.addRule(new ConnectAllRule(Color.Dark))',
  ],
  [
    'RegionAreaRule',
    RegionAreaRule,
    '.addRule(new RegionAreaRule(Color.Dark, 2))',
  ],
  [
    'CustomRule',
    CustomRule,
    `.addRule(new CustomRule(\n  'Description',\n  GridData.create([])\n))`,
  ],
  ['UndercluedRule', UndercluedRule, '.addRule(new UndercluedRule())'],
  ['LetterSymbol', LetterSymbol, '.addSymbol(new LetterSymbol(1, 1, "A"))'],
  ['NumberSymbol', NumberSymbol, '.addSymbol(new NumberSymbol(1, 1, 3))'],
  [
    'ViewpointSymbol',
    ViewpointSymbol,
    '.addSymbol(new ViewpointSymbol(1, 1, 3))',
  ],
  ['Color', Color, 'Color.Dark\nColor.Light\nColor.Gray'],
] as const;

const options: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 5,
  lineNumbersMinChars: 0,
  wrappingIndent: 'indent',
  wrappingStrategy: 'advanced',
  wordWrap: 'on',
  formatOnType: true,
};

export default memo(function SourceCodeEditor() {
  const navigate = useNavigate();
  const state = useRouterState();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };
  const [toast, setToast] = useState<{
    message: string;
    handle: number;
  } | null>(null);
  const monaco = useMonaco();

  useEffect(() => {
    import('../../types/logic-pad.d.ts?raw')
      .then(({ default: def }) => {
        monaco?.languages.typescript.javascriptDefaults.addExtraLib(
          def,
          'file:///logic-pad.d.ts'
        );
      })
      .catch(console.log);
  }, [monaco]);

  const parseJs = () => {
    if (editorRef.current) {
      const value = editorRef.current.getValue();
      window.localStorage.setItem('sourceCode', value);
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const func = new Function(...enclosure.map(([name]) => name), value);
        const puzzle: Puzzle = PuzzleSchema.parse(
          func(...enclosure.map(([, value]) => value))
        );
        Compressor.compress(Serializer.stringifyPuzzle(puzzle))
          .then(d =>
            navigate({
              to: state.location.pathname,
              search: {
                d,
              },
            })
          )
          .catch(console.log);
      } catch (error) {
        if (toast !== null) clearTimeout(toast.handle);
        const handle = window.setTimeout(() => setToast(null), 5000);
        if (error instanceof ZodError) {
          setToast({
            message:
              error.errors[0].path.join('.') + ': ' + error.errors[0].message,
            handle,
          });
        } else if (error instanceof Error) {
          setToast({ message: error.message, handle });
        }
      }
    }
  };

  return (
    <>
      <div className="justify-self-stretch dropdown dropdown-right">
        <div
          tabIndex={0}
          className="h-full w-full overflow-x-hidden focus-within:overflow-x-visible focus-within:w-[200%] transition-[width] duration-75"
        >
          <Editor
            height="70vh"
            width="600px"
            className="z-50"
            defaultLanguage="javascript"
            defaultValue={
              window.localStorage.getItem('sourceCode') ??
              "return {\n  title: '',\n  grid: GridData.create([]),\n  solution: null,\n  difficulty: 1,\n  author: '',\n  link: '',\n  description: ''\n};"
            }
            options={options}
            onMount={handleEditorDidMount}
          />
        </div>
        <div className="dropdown-content shadow-xl bg-base-300 rounded-box z-10 ml-[calc(300px+1rem)] p-4 w-[400px] h-[70vh] overflow-y-auto">
          <div className="flex flex-col flex-nowrap gap-2">
            <h3 className="text-lg">Quick reference</h3>
            {enclosure.map(
              ([_, __, example]) =>
                example && (
                  <pre key={example} className="text-xs text-base-content">
                    {example}
                  </pre>
                )
            )}
          </div>
        </div>
      </div>
      <div
        className="tooltip w-full"
        data-tip="Source code is NOT saved in the puzzle link! Remember to back up your code."
      >
        <button className="btn btn-primary w-full" onClick={parseJs}>
          Load puzzle
        </button>
      </div>
      <div className="toast toast-start mb-40 z-50">
        {toast && (
          <div className="alert alert-error w-[290px] whitespace-normal">
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
});
