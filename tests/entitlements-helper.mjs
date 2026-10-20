// Loads lib/entitlements.ts (with lib/plans.ts and lib/owner.ts) for tests
// that run modules in a vm and hand them a fake `require`.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const run = (file, require) => { const exports = {}; vm.runInNewContext(transpile(file), { exports, require, Date, Number, Math, JSON }); return exports; };

export function loadEntitlements() {
  const callPricing = run('lib/call-pricing.ts', () => ({}));
  const smsPricing = run('lib/sms-pricing.ts', () => ({}));
  const plans = run('lib/plans.ts', (name) => (name.includes('call-pricing') ? callPricing : smsPricing));
  const owner = run('lib/owner.ts', () => ({}));
  return run('lib/entitlements.ts', (name) => (name.includes('owner') ? owner : plans));
}
