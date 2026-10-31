import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import type {CacheSave} from './context';

/**
 * Where the exported store travels between runs, the same directory the
 * workflows from `ns ci init` use. The store itself stays in `store`.
 */
export const transferDir = (home: string = os.homedir()): string => path.join(home, '.naspeed-ci');

export interface KeyParts {
  prefix: string;
  os: string;
  arch: string;
  rustc: string;
  lockHash: string;
}

/**
 * Cache keys: OS, arch and compiler keep incompatible artifacts apart and the
 * lockfile hash narrows to the same dependency set. Keys are immutable, so
 * every save adds the run to the key; restore picks the newest entry that
 * shares a prefix, falling back to any lockfile for the same compiler.
 */
export const cacheKeys = (
  p: KeyParts,
  run: {id: string; attempt: string; job: string}
): {key: string; restoreKeys: string[]} => {
  const compiler = `${p.prefix}-${p.os}-${p.arch}-${p.rustc}-`;
  const base = `${compiler}${p.lockHash}-`;
  return {key: `${base}${run.id}-${run.attempt}-${run.job}`, restoreKeys: [base, compiler]};
};

/**
 * `auto` saves only on pushes to the default branch: pull requests (forks
 * included) can read the cache but never write what main builds restore.
 */
export const shouldSave = (
  mode: CacheSave,
  event: {name: string; ref: string; defaultBranch: string | undefined}
): boolean => {
  if (mode !== 'auto') return mode === 'true';
  return (
    event.name === 'push' && event.defaultBranch !== undefined && event.ref === `refs/heads/${event.defaultBranch}`
  );
};

export const defaultBranch = (): string | undefined => {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'))?.repository?.default_branch;
  } catch {
    return undefined;
  }
};

/** `1.98.0` from `rustc 1.98.0 (88d9e12ae 2026-08-18)`, or `unknown`. */
export async function rustcVersion(cwd: string): Promise<string> {
  const out = await exec.getExecOutput('rustc', ['--version'], {cwd, ignoreReturnCode: true, silent: true});
  const version = out.exitCode === 0 ? out.stdout.trim().split(/\s+/)[1] : undefined;
  if (!version) {
    core.warning('rustc --version failed; install the Rust toolchain before naspeed-action');
    return 'unknown';
  }
  return version;
}

export async function lockHash(): Promise<string> {
  return (await glob.hashFiles('**/Cargo.lock')) || 'nolock';
}

/** Restores the exported store and merges it into `store`. */
export async function restore(
  naspeed: string,
  store: string,
  dir: string,
  keys: {key: string; restoreKeys: string[]}
): Promise<string | undefined> {
  if (!cache.isFeatureAvailable()) {
    core.warning('The GitHub Actions cache is not available on this runner; naspeed starts cold');
    return undefined;
  }
  const matched = await cache.restoreCache([dir], keys.key, keys.restoreKeys);
  if (!matched) {
    core.info('No saved naspeed store; starting cold');
    return undefined;
  }
  core.info(`Restored naspeed store from ${matched}`);
  if (fs.existsSync(path.join(dir, 'entries'))) {
    await exec.exec(naspeed, ['cache', 'import', dir, '--store', store]);
  }
  return matched;
}

/** Exports recently used store entries and saves them under `key`. */
export async function save(naspeed: string, store: string, dir: string, key: string, maxGb: number): Promise<void> {
  if (!cache.isFeatureAvailable()) {
    core.warning('The GitHub Actions cache is not available on this runner; naspeed store not saved');
    return;
  }
  // Export reuses objects the restore left in `dir` and prunes the rest.
  await exec.exec(naspeed, ['cache', 'export', dir, '--max-gb', String(maxGb), '--store', store]);
  try {
    await cache.saveCache([dir], key);
    core.info(`Saved naspeed store as ${key}`);
  } catch (error) {
    // Another job of the same run (a matrix sharing this key) saved first.
    core.warning(`naspeed store not saved: ${(error as Error).message}`);
  }
}
