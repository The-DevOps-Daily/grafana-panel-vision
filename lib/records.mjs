// Read one configuration's results file for scoring. On top of the stamp check
// (lib/stamp.mjs), every record must name the configuration of its file and
// that configuration's model, so a file copied or renamed from another
// configuration is refused even though all configurations share one stamp.
// (The stamp covers lib/configs.mjs, so the settings behind each id are fixed.)
import { readStamped } from './stamp.mjs';
import { CONFIGS } from './configs.mjs';

export function readConfigRecords(file, stamp, id) {
  const cfg = CONFIGS[id];
  if (!cfg) throw new Error(`${file}: ${id} is not a configuration in lib/configs.mjs`);
  const recs = readStamped(file, stamp);
  for (const r of recs) {
    if (r.config !== id) throw new Error(`${file}: record for ${r.panel} run ${r.run} is from configuration ${r.config}, not ${id}`);
    if (r.model !== cfg.model) throw new Error(`${file}: record for ${r.panel} run ${r.run} used model ${r.model}, not ${cfg.model}`);
  }
  return recs;
}
