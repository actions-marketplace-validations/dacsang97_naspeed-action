import {describe, expect, it} from 'vite-plus/test';
import {cacheKeys, shouldSave, transferDir} from '../src/store-cache';

describe('cacheKeys', () => {
  const {key, restoreKeys} = cacheKeys(
    {prefix: 'test', os: 'Linux', arch: 'X64', rustc: '1.98.0', lockHash: 'abc'},
    {id: '42', attempt: '1', job: 'test'}
  );

  it('makes every save a new key', () => {
    expect(key).toBe('test-Linux-X64-1.98.0-abc-42-1-test');
  });

  it('restores the same lockfile first, then any lockfile for the compiler', () => {
    expect(restoreKeys).toEqual(['test-Linux-X64-1.98.0-abc-', 'test-Linux-X64-1.98.0-']);
    for (const prefix of restoreKeys) expect(key.startsWith(prefix)).toBe(true);
  });
});

describe('shouldSave', () => {
  const push = {name: 'push', ref: 'refs/heads/main', defaultBranch: 'main'};

  it('auto saves only pushes to the default branch', () => {
    expect(shouldSave('auto', push)).toBe(true);
    expect(shouldSave('auto', {...push, ref: 'refs/heads/feature'})).toBe(false);
    expect(shouldSave('auto', {...push, name: 'pull_request', ref: 'refs/pull/1/merge'})).toBe(false);
    expect(shouldSave('auto', {...push, defaultBranch: undefined})).toBe(false);
  });

  it('true and false override the event', () => {
    expect(shouldSave('true', {...push, name: 'pull_request'})).toBe(true);
    expect(shouldSave('false', push)).toBe(false);
  });
});

describe('transferDir', () => {
  it('is the ns ci init cache directory', () => {
    expect(transferDir('/home/runner')).toBe('/home/runner/.naspeed-ci');
  });
});
