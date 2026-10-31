import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as context from './context';
import * as installer from './install';
import * as storeCache from './store-cache';

// The same bundle runs as `main` and as `post`; main leaves this state behind.
const IS_POST = 'isPost';

async function run(): Promise<void> {
  const inputs = context.getInputs();
  core.saveState(IS_POST, 'true');

  const tag = await installer.resolveTag(inputs.version, inputs.token);
  const target = installer.targetFor(os.platform(), os.arch());
  const bin = await installer.install(tag, target);
  core.addPath(path.dirname(bin));
  core.setOutput('version', tag.replace(/^v/, ''));
  core.setOutput('path', bin);
  core.info(`naspeed ${tag} installed (${target})`);

  if (inputs.installOnly) return;

  // `setup` installs naspeed and the `ns` alias into $CARGO_HOME/bin and
  // points build.rustc-wrapper in $CARGO_HOME/config.toml at it.
  const cargoBin = path.join(process.env.CARGO_HOME || path.join(os.homedir(), '.cargo'), 'bin');
  core.addPath(cargoBin);
  await exec.exec(bin, ['setup', '--store', inputs.store, ...inputs.setupArgs]);
  const naspeed = path.join(cargoBin, 'naspeed');

  if (!inputs.cache) return;

  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const keys = storeCache.cacheKeys(
    {
      prefix: inputs.cacheKey,
      os: process.env.RUNNER_OS || os.platform(),
      arch: process.env.RUNNER_ARCH || os.arch(),
      rustc: await storeCache.rustcVersion(workspace),
      lockHash: await storeCache.lockHash()
    },
    {
      id: process.env.GITHUB_RUN_ID || '0',
      attempt: process.env.GITHUB_RUN_ATTEMPT || '1',
      job: process.env.GITHUB_JOB || 'job'
    }
  );
  const dir = storeCache.transferDir();
  const matched = await storeCache.restore(naspeed, inputs.store, dir, keys);
  core.setOutput('cache-hit', matched ? 'true' : 'false');
  core.setOutput('cache-matched-key', matched || '');

  const save = storeCache.shouldSave(inputs.cacheSave, {
    name: process.env.GITHUB_EVENT_NAME || '',
    ref: process.env.GITHUB_REF || '',
    defaultBranch: storeCache.defaultBranch()
  });
  if (save) {
    core.saveState(
      'save',
      JSON.stringify({naspeed, store: inputs.store, dir, key: keys.key, maxGb: inputs.cacheMaxGb})
    );
  } else {
    core.info('The naspeed store will not be saved by this run (cache-save)');
  }
}

async function post(): Promise<void> {
  const state = core.getState('save');
  if (!state) return;
  const {naspeed, store, dir, key, maxGb} = JSON.parse(state);
  await storeCache.save(naspeed, store, dir, key, maxGb);
}

// A failed save only costs the next run its warm start, so it never fails the job.
if (core.getState(IS_POST) === 'true') {
  post().catch(error => core.warning(`naspeed store not saved: ${(error as Error).message}`));
} else {
  run().catch(error => core.setFailed((error as Error).message));
}
