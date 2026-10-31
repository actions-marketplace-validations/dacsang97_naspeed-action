// Tree-shaped log lines matching naspeed's own output (src/ui.rs in naspeed):
// `• step` bold at the top level, nested `• detail` lines, `key=value` fields
// in one column, `• took: 12s`.

/** Column where fields start, counted from the line start. */
const FIELD_COLUMN = 40;

export type Level = 'info' | 'warn' | 'error' | 'took';
export type Fields = Record<string, string | number | boolean | undefined>;

/** Depth handed to naspeed so its lines nest under the action's step. */
export const INDENT_ENV = 'NASPEED_UI_INDENT';

let depth = 0;

/** GitHub's log viewer renders ANSI; NO_COLOR turns it off. */
export const colorEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  !env.NO_COLOR && (env.GITHUB_ACTIONS === 'true' || Boolean(env.FORCE_COLOR));

const paint = (text: string, code: string, color: boolean): string => (color ? `\x1b[${code}m${text}\x1b[0m` : text);

export function formatLine(level: Level, msg: string, fields: Fields, d: number, color: boolean): string {
  const [bullet, bulletColor] = level === 'error' ? ['⨯', '31'] : level === 'warn' ? ['•', '33'] : ['•', '34'];
  const msgStyle = level === 'error' ? '1;31' : level === 'warn' ? '33' : level === 'took' ? '3' : d === 0 ? '1' : '';
  const lead = '  '.repeat(d);
  let line = `${lead}${paint(bullet, bulletColor, color)} ${msgStyle ? paint(msg, msgStyle, color) : msg}`;
  const shown = Object.entries(fields).filter(([, v]) => v !== undefined && v !== '');
  if (shown.length > 0) {
    // Pad on the visible width; escape codes take no columns.
    const visible = lead.length + 2 + Array.from(msg).length;
    line += ' '.repeat(Math.max(FIELD_COLUMN - visible, 1));
    line += shown.map(([k, v]) => `${paint(k, '1;34', color)}=${v}`).join(' ');
  }
  return line;
}

const emit = (level: Level, msg: string, fields: Fields = {}): void => {
  process.stdout.write(`${formatLine(level, msg, fields, depth, colorEnabled())}\n`);
};

export const info = (msg: string, fields?: Fields): void => emit('info', msg, fields);
export const warn = (msg: string, fields?: Fields): void => emit('warn', msg, fields);
export const error = (msg: string, fields?: Fields): void => emit('error', msg, fields);

/** Current depth, for child processes (see INDENT_ENV). */
export const currentDepth = (): number => depth;

/** Runs `fn` with its lines one level deeper. */
export async function nested<T>(fn: () => Promise<T>): Promise<T> {
  depth++;
  try {
    return await fn();
  } finally {
    depth--;
  }
}

/** `850ms`, `12s`, `4m21s`, `1h02m`, as naspeed prints them. */
export function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  if (secs === 0) return `${Math.floor(ms)}ms`;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m${pad(secs % 60)}s`;
  return `${Math.floor(secs / 3600)}h${pad(Math.floor((secs % 3600) / 60))}m`;
}

/** `• took: 12s` one level down, for steps of a second or more. */
export function took(startMs: number, now: number = Date.now()): void {
  const elapsed = now - startMs;
  if (elapsed < 1000) return;
  process.stdout.write(`${formatLine('took', `took: ${formatDuration(elapsed)}`, {}, depth + 1, colorEnabled())}\n`);
}
