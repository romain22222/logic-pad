import { memo, useState } from 'react';
import { cn, externalReducedMotion, siteOptions } from '../utils';

export default memo(function AnimationToggle() {
  const [reduceMotion, setReduceMotion] = useState(
    siteOptions.reducedMotionOverride
  );
  const toggleReduceMotion = () => {
    setReduceMotion(sa => {
      const val = !sa;
      siteOptions.reducedMotionOverride = val;
      window.localStorage.setItem('reducedMotion', String(val));
      return val;
    });
  };
  const external = externalReducedMotion();
  return (
    <div
      className="tooltip tooltip-info tooltip-bottom"
      data-tip={
        external
          ? 'Fancy animations are disabled by the browser'
          : 'Toggle fancy animations'
      }
    >
      <button
        className={cn(
          'btn btn-square',
          reduceMotion ? 'text-base-content/30' : 'text-base-content'
        )}
        disabled={external}
        onClick={toggleReduceMotion}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="currentColor"
        >
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M15 2c-2.71 0-5.05 1.54-6.22 3.78-1.28.67-2.34 1.72-3 3C3.54 9.95 2 12.29 2 15c0 3.87 3.13 7 7 7 2.71 0 5.05-1.54 6.22-3.78 1.28-.67 2.34-1.72 3-3C20.46 14.05 22 11.71 22 9c0-3.87-3.13-7-7-7zM9 20c-2.76 0-5-2.24-5-5 0-1.12.37-2.16 1-3 0 3.87 3.13 7 7 7-.84.63-1.88 1-3 1zm3-3c-2.76 0-5-2.24-5-5 0-1.12.37-2.16 1-3 0 3.86 3.13 6.99 7 7-.84.63-1.88 1-3 1zm4.7-3.3c-.53.19-1.1.3-1.7.3-2.76 0-5-2.24-5-5 0-.6.11-1.17.3-1.7.53-.19 1.1-.3 1.7-.3 2.76 0 5 2.24 5 5 0 .6-.11 1.17-.3 1.7zM19 12c0-3.86-3.13-6.99-7-7 .84-.63 1.87-1 3-1 2.76 0 5 2.24 5 5 0 1.12-.37 2.16-1 3z" />
          <path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none" />
        </svg>
      </button>
    </div>
  );
});
