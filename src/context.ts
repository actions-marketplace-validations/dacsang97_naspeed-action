import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';

export type CacheSave = 'auto' | 'true' | 'false';

export interface Inputs {
  version: string;
  store: string;
  setupArgs: string[];
  installOnly: boolean;
  cache: boolean;
  cacheKey: string;
  cacheSave: CacheSave;
  cacheMaxGb: number;
  token: string;
}

/** `~` and `~/…` expand to the runner's home directory. */
export const expandHome = (p: string, home: string = os.homedir()): string => {
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p;
};

/** Splits `setup-args` on whitespace; naspeed setup flags never contain spaces. */
export const splitArgs = (args: string): string[] => args.split(/\s+/).filter(a => a.length > 0);

export const parseCacheSave = (value: string): CacheSave => {
  const v = (value || 'auto').trim().toLowerCase();
  if (v === 'auto' || v === 'true' || v === 'false') return v;
  throw new Error(`cache-save must be auto, true or false (got "${value}")`);
};

export const parseMaxGb = (value: string): number => {
  const gb = Number(value || '3');
  if (!Number.isFinite(gb) || gb <= 0) {
    throw new Error(`cache-max-gb must be a positive number (got "${value}")`);
  }
  return gb;
};

export function getInputs(): Inputs {
  return {
    version: core.getInput('version') || 'latest',
    store: expandHome(core.getInput('store') || '~/.naspeed'),
    setupArgs: splitArgs(core.getInput('setup-args')),
    installOnly: core.getBooleanInput('install-only'),
    cache: core.getBooleanInput('cache'),
    cacheKey: core.getInput('cache-key') || 'naspeed',
    cacheSave: parseCacheSave(core.getInput('cache-save')),
    cacheMaxGb: parseMaxGb(core.getInput('cache-max-gb')),
    token: core.getInput('token')
  };
}
