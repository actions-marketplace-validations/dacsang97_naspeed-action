import {describe, expect, it} from 'vite-plus/test';
import {colorEnabled, formatDuration, formatLine} from '../src/ui';

describe('formatLine', () => {
  it('nests and aligns fields like naspeed', () => {
    expect(formatLine('info', 'exporting store', {dir: '/ci'}, 0, false)).toBe(
      `• exporting store${' '.repeat(23)}dir=/ci`
    );
    expect(formatLine('info', 'exported', {entries: 3, size: '1 KiB'}, 1, false)).toBe(
      `  • exported${' '.repeat(28)}entries=3 size=1 KiB`
    );
    expect(formatLine('warn', 'skipped', {}, 2, false)).toBe('    • skipped');
    expect(formatLine('error', 'failed', {}, 0, false)).toBe('⨯ failed');
  });

  it('drops empty fields and keeps one space after long messages', () => {
    const msg = 'm'.repeat(60);
    expect(formatLine('info', msg, {k: 1, empty: '', none: undefined}, 0, false)).toBe(`• ${msg} k=1`);
  });

  it('colors bullet, top-level message and keys without moving the column', () => {
    const line = formatLine('info', 'step', {k: 'v'}, 0, true);
    expect(line.startsWith('\x1b[34m•\x1b[0m \x1b[1mstep\x1b[0m')).toBe(true);
    expect(line.endsWith('\x1b[1;34mk\x1b[0m=v')).toBe(true);
    const stripped = ['\x1b[34m', '\x1b[1m', '\x1b[1;34m', '\x1b[0m'].reduce((s, code) => s.replaceAll(code, ''), line);
    expect(stripped).toBe(formatLine('info', 'step', {k: 'v'}, 0, false));
  });
});

describe('formatDuration', () => {
  it('reads like naspeed', () => {
    expect(formatDuration(850)).toBe('850ms');
    expect(formatDuration(12_000)).toBe('12s');
    expect(formatDuration(261_000)).toBe('4m21s');
    expect(formatDuration(3_720_000)).toBe('1h02m');
  });
});

describe('colorEnabled', () => {
  it('is on in GitHub Actions unless NO_COLOR', () => {
    expect(colorEnabled({GITHUB_ACTIONS: 'true'})).toBe(true);
    expect(colorEnabled({GITHUB_ACTIONS: 'true', NO_COLOR: '1'})).toBe(false);
    expect(colorEnabled({})).toBe(false);
    expect(colorEnabled({FORCE_COLOR: '1'})).toBe(true);
  });
});
