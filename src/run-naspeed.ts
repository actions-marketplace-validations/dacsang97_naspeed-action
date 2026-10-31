import {spawn} from 'child_process';
import * as ui from './ui';

/**
 * Runs naspeed with the runner's stdout/stderr, one level below the action's
 * current step (naspeed reads INDENT_ENV), without the `[command]` echo
 * @actions/exec would add. Resolves to the exit code.
 */
export function runNaspeed(bin: string, args: string[], extraDepth = 1, cwd?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      stdio: 'inherit',
      env: {...process.env, [ui.INDENT_ENV]: String(ui.currentDepth() + extraDepth)}
    });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve(code ?? (signal ? 128 : 1)));
  });
}

/** Like runNaspeed, but a non-zero exit is an error. */
export async function runNaspeedOrThrow(bin: string, args: string[], extraDepth = 1): Promise<void> {
  const code = await runNaspeed(bin, args, extraDepth);
  if (code !== 0) throw new Error(`naspeed ${args.join(' ')} failed with exit code ${code}`);
}
