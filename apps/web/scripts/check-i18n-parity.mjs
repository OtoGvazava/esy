#!/usr/bin/env node
// i18n parity gate: every key in src/locales/en/<ns>.json MUST exist in
// src/locales/ka/<ns>.json and vice-versa, for every namespace. Exits 1 on
// any mismatch. Wired into pre-commit, CI, and the Claude hook so a change
// that adds a string in one language but not the other cannot land.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales');
const LANGS = ['en', 'ka'];

function deepKeys(obj, prefix = '') {
  const out = new Set();
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const kk of deepKeys(v, p)) out.add(kk);
      } else {
        out.add(p);
      }
    }
  }
  return out;
}

const load = (lang, ns) => {
  const f = join(root, lang, ns);
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')); }
  catch (e) { console.error(`✖ ${lang}/${ns} is not valid JSON: ${e.message}`); process.exitCode = 1; return {}; }
};

const namespaces = new Set();
for (const lang of LANGS) {
  const dir = join(root, lang);
  if (!existsSync(dir)) { console.error(`✖ missing locale dir: src/locales/${lang}`); process.exit(1); }
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) namespaces.add(f);
}

let bad = false;
for (const ns of [...namespaces].sort()) {
  const en = load('en', ns);
  const ka = load('ka', ns);
  if (en === null) { console.error(`✖ ${ns}: missing in en`); bad = true; continue; }
  if (ka === null) { console.error(`✖ ${ns}: missing in ka`); bad = true; continue; }
  const ek = deepKeys(en);
  const kk = deepKeys(ka);
  const missingKa = [...ek].filter((k) => !kk.has(k));
  const missingEn = [...kk].filter((k) => !ek.has(k));
  if (missingKa.length || missingEn.length) {
    bad = true;
    console.error(`✖ ${ns}`);
    if (missingKa.length) console.error(`   missing in ka: ${missingKa.join(', ')}`);
    if (missingEn.length) console.error(`   missing in en: ${missingEn.join(', ')}`);
  } else {
    console.log(`✓ ${ns} (${ek.size} keys)`);
  }
}

if (bad || process.exitCode === 1) {
  console.error('\ni18n parity FAILED — every key must exist in both en and ka.');
  process.exit(1);
}
console.log('\ni18n parity OK — en ↔ ka in sync.');
