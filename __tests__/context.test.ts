import {describe, expect, it} from 'vite-plus/test';
import {expandHome, parseCacheSave, parseMaxGb, splitArgs} from '../src/context';

describe('expandHome', () => {
  it('expands ~ and ~/ only', () => {
    expect(expandHome('~', '/home/runner')).toBe('/home/runner');
    expect(expandHome('~/.naspeed', '/home/runner')).toBe('/home/runner/.naspeed');
    expect(expandHome('/mnt/store', '/home/runner')).toBe('/mnt/store');
    expect(expandHome('~other/x', '/home/runner')).toBe('~other/x');
  });
});

describe('splitArgs', () => {
  it('splits on any whitespace and drops empties', () => {
    expect(splitArgs('')).toEqual([]);
    expect(splitArgs('  --cross\n --install-targets ')).toEqual(['--cross', '--install-targets']);
  });
});

describe('parseCacheSave', () => {
  it('accepts auto, true and false', () => {
    expect(parseCacheSave('')).toBe('auto');
    expect(parseCacheSave('TRUE')).toBe('true');
    expect(parseCacheSave('false')).toBe('false');
    expect(() => parseCacheSave('always')).toThrow(/auto, true or false/);
  });
});

describe('parseMaxGb', () => {
  it('needs a positive number', () => {
    expect(parseMaxGb('')).toBe(3);
    expect(parseMaxGb('2.5')).toBe(2.5);
    expect(() => parseMaxGb('0')).toThrow();
    expect(() => parseMaxGb('lots')).toThrow();
  });
});
