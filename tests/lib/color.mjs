// The brand colour rule (D-15, D-23): what counts as "blue", and where blue literals hide in text.

// CSS HSL, unrounded: blue = alpha not 0, hue 185-265 deg, saturation >= 0.25, lightness 0.10-0.92.
export function isBlue(r, g, b, a = 1) {
  if (a === 0) return false;
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return false;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  return h >= 185 && h <= 265 && s >= 0.25 && l >= 0.10 && l <= 0.92;
}

// '#rgb' | '#rrggbb' | '#rrggbbaa' | 'rgb(r,g,b)' | 'rgba(r,g,b,a)' -> [r, g, b, a].
export function parseColor(literal) {
  const s = literal.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), hex.length === 8 ? n(6) / 255 : 1];
  }
  const parts = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')).split(/[\s,/]+/).filter(Boolean).map(Number);
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

// Hex literals not inside a word or an HTML entity, and rgb()/rgba() calls.
export const COLOR_LITERAL = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])|rgba?\([^)]*\)/g;

export function blueLiterals(text) {
  return [...text.matchAll(COLOR_LITERAL)].map((m) => m[0]).filter((lit) => isBlue(...parseColor(lit)));
}
