/**
 * Insert extra stops between gradient anchors by linear RGB blend.
 * Keeps the same anchor colors/locations; adds midpoints for a softer blend.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  const n = parseInt(h.length === 6 ? h : h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const n = (r << 16) | (g << 8) | b;
  return `#${n.toString(16).padStart(6, "0")}`;
}

function lerpHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(
    Math.round(A.r + (B.r - A.r) * t),
    Math.round(A.g + (B.g - A.g) * t),
    Math.round(A.b + (B.b - A.b) * t),
  );
}

export type ExpandedGradient = {
  colors: string[];
  locations: number[];
};

/**
 * For each consecutive pair of anchors, inserts one midpoint color at the
 * midpoint location. Anchors unchanged; midpoints are 50% blends in RGB space.
 */
export function expandGradientMidpoints(
  colors: readonly string[],
  locations: readonly number[],
): ExpandedGradient {
  if (colors.length !== locations.length || colors.length < 2) {
    return { colors: [...colors], locations: [...locations] };
  }

  const outC: string[] = [];
  const outL: number[] = [];

  for (let i = 0; i < colors.length; i++) {
    outC.push(colors[i]);
    outL.push(locations[i]);
    if (i < colors.length - 1) {
      const midL = (locations[i] + locations[i + 1]) / 2;
      outC.push(lerpHex(colors[i], colors[i + 1], 0.5));
      outL.push(midL);
    }
  }

  return { colors: outC, locations: outL };
}

/**
 * Two interior blends per segment (t = 1/3, 2/3) for an even softer ramp.
 */
export function expandGradientThirds(
  colors: readonly string[],
  locations: readonly number[],
): ExpandedGradient {
  if (colors.length !== locations.length || colors.length < 2) {
    return { colors: [...colors], locations: [...locations] };
  }

  const outC: string[] = [];
  const outL: number[] = [];

  for (let i = 0; i < colors.length - 1; i++) {
    const lo = locations[i];
    const hi = locations[i + 1];
    const span = hi - lo;
    if (i === 0) {
      outC.push(colors[i]);
      outL.push(lo);
    }
    outC.push(lerpHex(colors[i], colors[i + 1], 1 / 3));
    outL.push(lo + span / 3);
    outC.push(lerpHex(colors[i], colors[i + 1], 2 / 3));
    outL.push(lo + (2 * span) / 3);
    outC.push(colors[i + 1]);
    outL.push(hi);
  }

  return { colors: outC, locations: outL };
}
