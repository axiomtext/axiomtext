// Fails if any production dependency uses a license that conflicts with MIT distribution.
import { execSync } from 'node:child_process';

const BLOCKED = /\b(A?GPL|LGPL|SSPL|BUSL|Commons-Clause|CC-BY-NC)/i;

const raw = execSync('pnpm licenses list --json --prod', { encoding: 'utf8' });
const byLicense = JSON.parse(raw);
const problems = [];
for (const [license, pkgs] of Object.entries(byLicense)) {
  if (BLOCKED.test(license)) {
    for (const p of pkgs) problems.push(`${p.name}@${p.versions?.join(',')} — ${license}`);
  }
}
if (problems.length > 0) {
  console.error('Blocked licenses found in production dependencies:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`License check passed (${Object.keys(byLicense).length} license types, none blocked).`);
