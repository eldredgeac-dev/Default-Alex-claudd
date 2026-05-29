import { describe, it, expect } from 'vitest';
import {
  SCALE, WBL_CTR, BVI_CTR, WBL_ACRES,
  translatePoly, shoelaceDeg2, squareDegsToAcres, normalizeLake,
} from '../geo.js';

// Same polygon used in public/bvi-map.html — true surveyed WBL shoreline.
const WBL_MAIN = [
  [45.08518,-93.00101],[45.08006,-93.01096],[45.0778,-93.01618],
  [45.07506,-93.01669],[45.07435,-93.01585],[45.07399,-93.01332],
  [45.07446,-93.01281],[45.07339,-93.00995],[45.07244,-93.01011],
  [45.07173,-93.01062],[45.07101,-93.01062],[45.0703,-93.00624],
  [45.07006,-93.00505],[45.06947,-93.00455],[45.06935,-93.00387],
  [45.06911,-93.00286],[45.06923,-93.00168],[45.06923,-93.00118],
  [45.07006,-93.00067],[45.07113,-92.99663],[45.06994,-92.99174],
  [45.07006,-92.98972],[45.06744,-92.98567],[45.06625,-92.98517],
  [45.06601,-92.98416],[45.06363,-92.97674],[45.06185,-92.97489],
  [45.06065,-92.97168],[45.05934,-92.97084],[45.05768,-92.96814],
  [45.05672,-92.9673],[45.05613,-92.9673],[45.05577,-92.96679],
  [45.05589,-92.96426],[45.05649,-92.96241],[45.06113,-92.96157],
  [45.06363,-92.96325],[45.07042,-92.96089],[45.07423,-92.96157],
  [45.07673,-92.9641],[45.07887,-92.96494],[45.08089,-92.96426],
  [45.0822,-92.9673],[45.08208,-92.97151],[45.08066,-92.97353],
  [45.07887,-92.97438],[45.07839,-92.97488],[45.07732,-92.97724],
  [45.07816,-92.97758],[45.08137,-92.97572],[45.0822,-92.97572],
  [45.08327,-92.97083],[45.0847,-92.97017],[45.08565,-92.97185],
  [45.08863,-92.97337],[45.09053,-92.97724],[45.09315,-92.98163],
  [45.09375,-92.98281],[45.09446,-92.98483],[45.09613,-92.98416],
  [45.0972,-92.98584],[45.09756,-92.98871],[45.0972,-92.9914],
  [45.09589,-92.99528],[45.09458,-92.99596],[45.09375,-92.99646],
  [45.09256,-92.99815],[45.09053,-92.99933],[45.08863,-92.99966],
  [45.08685,-92.99832],[45.08542,-92.9941],[45.08423,-92.99275],
  [45.0822,-92.9909],[45.08113,-92.99039],[45.08077,-92.98955],
  [45.08077,-92.98837],[45.08077,-92.98753],[45.0803,-92.98685],
  [45.07982,-92.98651],[45.07744,-92.98854],[45.07756,-92.99073],
  [45.07935,-92.99073],[45.08018,-92.99242],[45.08149,-92.99461],
  [45.08304,-92.99528],[45.08375,-92.99528],[45.08423,-92.99697],
  [45.08577,-92.9973],[45.08542,-93.00068],[45.08471,-93.0016],
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
