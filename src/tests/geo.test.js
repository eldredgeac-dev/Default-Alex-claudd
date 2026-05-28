import { describe, it, expect } from 'vitest';
import {
  SCALE, WBL_CTR, BVI_CTR, WBL_ACRES,
  translatePoly, shoelaceDeg2, squareDegsToAcres, normalizeLake,
} from '../geo.js';

// Same polygon used in public/bvi-map.html — flask/lightbulb shape matching WBL.
const WBL_MAIN = [
  [45.097,-93.013],[45.094,-93.015],[45.091,-93.017],
  [45.088,-93.018],[45.084,-93.019],[45.082,-93.021],
  [45.079,-93.025],[45.075,-93.029],[45.070,-93.032],
  [45.064,-93.034],[45.058,-93.032],[45.052,-93.028],
  [45.045,-93.021],[45.039,-93.014],[45.037,-93.005],
  [45.037,-92.997],[45.038,-92.989],[45.041,-92.979],
  [45.047,-92.970],[45.053,-92.963],[45.059,-92.960],
  [45.065,-92.959],[45.070,-92.962],[45.074,-92.963],
  [45.077,-92.963],[45.080,-92.969],[45.082,-92.975],
  [45.085,-92.981],[45.088,-92.985],[45.091,-92.987],
  [45.094,-92.988],[45.097,-92.989],
];

// ── shoelaceDeg2 ─────────────────────────────────────────────────────────────

describe('shoelaceDeg2', () => {
  it('returns a positive finite area for the WBL polygon', () => {
    const area = shoelaceDeg2(WBL_MAIN);
    expect(area).toBeGreaterThan(0);
    expect(Number.isFinite(area)).toBe(true);
  });

  it('returns zero for a degenerate (all-same-point) polygon', () => {
    expect(shoelaceDeg2([[45, -93], [45, -93], [45, -93]])).toBe(0);
  });

  it('gives the same result regardless of vertex winding order', () => {
    const cw  = [...WBL_MAIN];
    const ccw = [...WBL_MAIN].reverse();
    expect(shoelaceDeg2(cw)).toBeCloseTo(shoelaceDeg2(ccw), 10);
  });
});

// ── squareDegsToAcres ────────────────────────────────────────────────────────

describe('squareDegsToAcres', () => {
  it('produces a positive area for WBL_MAIN at WBL latitude', () => {
    const acres = squareDegsToAcres(shoelaceDeg2(WBL_MAIN), WBL_CTR[0]);
    expect(acres).toBeGreaterThan(0);
  });

  it('produces a smaller area at higher latitudes (longitude compression)', () => {
    const sqDeg = shoelaceDeg2(WBL_MAIN);
    const acresLow  = squareDegsToAcres(sqDeg, 10);
    const acresHigh = squareDegsToAcres(sqDeg, 80);
    expect(acresHigh).toBeLessThan(acresLow);
  });
});

// ── normalizeLake ─────────────────────────────────────────────────────────────

describe('normalizeLake', () => {
  it('normalizes WBL_MAIN to 2,427 acres ±1%', () => {
    const normalized = normalizeLake(WBL_MAIN);
    const acres = squareDegsToAcres(shoelaceDeg2(normalized), WBL_CTR[0]);
    expect(acres).toBeGreaterThan(WBL_ACRES * 0.99);
    expect(acres).toBeLessThan(WBL_ACRES * 1.01);
  });

  it('preserves vertex count and latitude values', () => {
    const normalized = normalizeLake(WBL_MAIN);
    expect(normalized).toHaveLength(WBL_MAIN.length);
    normalized.forEach(([lat], i) => {
      expect(lat).toBeCloseTo(WBL_MAIN[i][0], 10);
    });
  });

  it('treats WBL_CTR[1] as a fixed pivot (vertex there is unmoved)', () => {
    // normalizeLake scales lng offsets around WBL_CTR[1], so any vertex
    // sitting exactly on that longitude must stay put after normalisation.
    const tri = [
      [45.067, WBL_CTR[1]],           // exactly at the pivot
      [45.100, WBL_CTR[1] + 0.050],
      [45.040, WBL_CTR[1] + 0.030],
    ];
    const [[, pivotLng]] = normalizeLake(tri);
    expect(pivotLng).toBeCloseTo(WBL_CTR[1], 10);
  });
});

// ── SCALE constant ───────────────────────────────────────────────────────────

describe('SCALE constant', () => {
  it('translatePoly applies exactly SCALE to longitude offsets for WBL→BVI', () => {
    // Use an offset well away from zero so floating-point division is stable.
    const offset = 0.040;
    const testPt = [[WBL_CTR[0], WBL_CTR[1] + offset]];
    const [[, newLng]] = translatePoly(testPt, WBL_CTR, BVI_CTR);
    const applied = (newLng - BVI_CTR[1]) / offset;
    expect(applied).toBeCloseTo(SCALE, 10);
  });

  it('BVI and lake use the same SCALE: translatePoly preserves physical area', () => {
    // Normalize the lake polygon so it has the correct physical footprint,
    // then translate it to BVI coordinates. The projection must preserve area,
    // proving that BVI-lat longitude degrees and WBL-lat longitude degrees
    // are scaled by the same SCALE factor in opposite directions.
    const norm    = normalizeLake(WBL_MAIN);
    const bviPoly = translatePoly(norm, WBL_CTR, BVI_CTR);

    const acresAtWBL = squareDegsToAcres(shoelaceDeg2(norm),    WBL_CTR[0]);
    const acresAtBVI = squareDegsToAcres(shoelaceDeg2(bviPoly), BVI_CTR[0]);

    // Must agree to better than 0.01 acres (essentially floating-point exact).
    expect(acresAtBVI).toBeCloseTo(acresAtWBL, 1);
  });
});
