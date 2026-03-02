import CompleteAreaNumber from './completeAreaNumber.js';
import ConnectAllCells from './connectAllCells.js';
import ConnectThroughBottleneck from './connectThroughBottleneck.js';
import InsightLemma from './insightLemma.js';
import OffByXAreaNumberConstrainedByRegionSize from './offByXAreaNumberConstrainedByRegionSize.js';

const allLemmas: readonly InsightLemma[] = [
  new OffByXAreaNumberConstrainedByRegionSize(),
  new ConnectAllCells(),
  new CompleteAreaNumber(),
  new ConnectThroughBottleneck(),
];

export default allLemmas;
