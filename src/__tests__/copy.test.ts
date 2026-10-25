import { describe, expect, it } from 'vitest';
import copy from '../copy.ts?raw';
import html from '../../index.html?raw';
import manifest from '../../public/manifest.webmanifest?raw';
import rounds from '../../public/rounds.json?raw';

describe('public copy', () => {
  it.each(Object.entries({ copy, html, manifest, rounds }))(
    '%s keeps the purpose neutral', (_name, source) => {
      expect(source).not.toMatch(/addition|expansion|expand|footprint|dormer|foundation|R-X/i);
    },
  );
});
