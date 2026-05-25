/**
 * Pure geographic math for the WBL ↔ BVI scale-comparison map.
 * No DOM, no Leaflet, no side effects — safe to import in tests.
 */

/** [lat, lng] centroid of White Bear Lake, MN */
export const WBL_CTR = [45.067, -93.000];

/** [lat, lng] default BVI drop point (mid Drake Channel) */
export const BVI_CTR = [18.420, -64.610];

/**
 * Longitude-compression ratio when projecting from WBL latitude to BVI latitude.
 * translatePoly applies exactly this factor to every longitude offset.
 * Shared by both the lake-overlay code and the BVI translation so the two
 * always agree on physical scale.
 */
export const SCALE =
  Math.cos((WBL_CTR[0] * Math.PI) / 180) /
  Math.cos((BVI_CTR[0] * Math.PI) / 180);

/** Authoritative surface area of White Bear Lake (MN DNR / Wikipedia: 2,427 ac). */
export const WBL_ACRES = 2427;

/**
 * Translate a polygon from `src` centre to `dst` centre while preserving
 * true physical distances across the latitude change.
 *
 * Longitude offsets are multiplied by cos(srcLat)/cos(dstLat) — the same
 * ratio exported as SCALE when src=WBL_CTR and dst=BVI_CTR.
 *
 * @param {[number,number][]} poly  – [[lat, lng], …]
 * @param {[number,number]}   src   – [lat, lng] source reference centre
 * @param {[number,number]}   dst   – [lat, lng] destination reference centre
 * @returns {[number,number][]}
 */
export function translatePoly(poly, src, dst) {
  const srcCos = Math.cos((src[0] * Math.PI) / 180);
  const dstCos = Math.cos((dst[0] * Math.PI) / 180);
  return poly.map(([lat, lng]) => [
    dst[0] + (lat - src[0]),
    dst[1] + (lng - src[1]) * (srcCos / dstCos),
  ]);
}

/**
 * Shoelace formula: unsigned area of a closed polygon in square degrees.
 * Vertices are [lat, lng] pairs; order (CW / CCW) does not matter.
 *
 * @param {[number,number][]} poly
 * @returns {number} area in square degrees (lat·lng)
 */
export function shoelaceDeg2(poly) {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [lat1, lng1] = poly[i];
    const [lat2, lng2] = poly[(i + 1) % n];
    area += lng1 * lat2 - lng2 * lat1;
  }
  return Math.abs(area) / 2;
}

const DEG_M = 111_320;           // metres per degree of latitude (WGS-84 mean)
const SQ_M_PER_ACRE = 4_046.856_4224;

/**
 * Convert a shoelace result (square degrees) to acres at `refLatDeg`.
 *
 * Physical area = sqDeg × (m/°lat) × (m/°lng)
 *              = sqDeg × DEG_M × DEG_M × cos(refLat)
 *
 * @param {number} sqDeg      – shoelace output in square degrees
 * @param {number} refLatDeg  – reference latitude in decimal degrees
 * @returns {number} area in acres
 */
export function squareDegsToAcres(sqDeg, refLatDeg) {
  const lngM = DEG_M * Math.cos((refLatDeg * Math.PI) / 180);
  return (sqDeg * DEG_M * lngM) / SQ_M_PER_ACRE;
}

/**
 * Scale a lake polygon's longitude offsets about `ctrLng` so that its
 * computed area equals WBL_ACRES (2,427 acres).
 *
 * Area is linear in the longitude-scale factor, so one multiplication suffices:
 *   new_area = old_area × factor  →  factor = WBL_ACRES / old_area
 *
 * This is the "lake normalisation" step: it corrects for any hand-drawn
 * distortion in the polygon coordinates while preserving shape and centre.
 *
 * @param {[number,number][]} poly
 * @param {number} [ctrLng=WBL_CTR[1]]  – pivot longitude
 * @returns {[number,number][]}
 */
export function normalizeLake(poly, ctrLng = WBL_CTR[1]) {
  const currentAcres = squareDegsToAcres(shoelaceDeg2(poly), WBL_CTR[0]);
  const factor = WBL_ACRES / currentAcres;
  return poly.map(([lat, lng]) => [lat, ctrLng + (lng - ctrLng) * factor]);
}
