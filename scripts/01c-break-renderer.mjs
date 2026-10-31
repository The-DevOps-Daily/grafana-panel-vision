// Break the renderer on purpose and prove that scripts/01b-check-panels.mjs
// notices. Works on a temporary copy; the repo is not changed.
//   1. byte axis labels use decimal GB while saying GiB (wrong labels)
//   2. every line is drawn 3% higher than the data (wrong geometry)
//   3. stacked bands drawn in the next series' colour (wrong series mapping)
// Each break must make the check fail with the expected kind of problem.
// Writes results/break-renderer.txt.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BREAKS = [
  {
    name: 'byte labels in decimal GB, marked GiB',
    file: 'lib/units.mjs',
    from: 'if (a >= GIB) return `${trim(v / GIB, digits)} GiB`;',
    to: 'if (a >= GIB) return `${trim(v / 1e9, digits)} GiB`;',
    expect: 'drawn peak reads',
  },
  {
    name: 'lines drawn 3% above the data',
    file: 'lib/panel.mjs',
    from: '${yToPx(axis, plot, v).toFixed(2)}`);',
    to: '${yToPx(axis, plot, v * 1.03).toFixed(2)}`);',
    expect: 'drawn peak reads',
  },
  {
    name: 'stacked bands in the next series colour',
    file: 'lib/panel.mjs',
    from: 'cum.push({ upper, colour: spec.series[si].colour, fillPts: [...upper, ...lower] });',
    to: 'cum.push({ upper, colour: spec.series[(si + 1) % spec.series.length].colour, fillPts: [...upper, ...lower] });',
    expect: 'thickest drawn band',
  },
];

const lines = [];
let allCaught = true;
for (const b of BREAKS) {
  const dir = mkdtempSync(join(tmpdir(), 'gpv-break-'));
  for (const d of ['lib', 'scripts', 'data', 'fonts']) cpSync(join(ROOT, d), join(dir, d), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(dir, 'package.json'));
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
  mkdirSync(join(dir, 'results'));
  const f = join(dir, b.file);
  const src = readFileSync(f, 'utf8');
  if (!src.includes(b.from)) throw new Error(`break "${b.name}": pattern not found in ${b.file}`);
  writeFileSync(f, src.replace(b.from, b.to));
  const r = spawnSync(process.execPath, [join(dir, 'scripts/01b-check-panels.mjs')], { encoding: 'utf8' });
  const out = (r.stdout || '').split('\n');
  const expected = out.filter((l) => l.includes(b.expect)).length;
  const caught = r.status !== 0 && expected > 0;
  if (!caught) allCaught = false;
  lines.push(`${b.name}: check exit ${r.status} (${caught ? 'caught' : 'NOT CAUGHT'}); ${out[0]}; "${b.expect}" problems: ${expected}`);
  rmSync(dir, { recursive: true, force: true });
}
writeFileSync(`${ROOT}results/break-renderer.txt`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
if (!allCaught) process.exit(1);
