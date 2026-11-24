// The "blue" rule (D-15): alpha not 0, CSS HSL hue 185-265, saturation >= 0.25, lightness 0.10-0.92.
import { test, expect } from '@playwright/test';
import { isBlue, parseColor, blueLiterals } from './lib/color.mjs';

const BLUE = ['#3ab3df', '#3fb6e0', '#65c4e6', '#007bff', '#002642', '#010446', '#182333', '#967adc'];
const NOT_BLUE = ['#02b5a0', '#35414b', '#556877', '#516163', '#70798b', '#d9e5e8', '#f7fafa', '#fbfcfd',
  '#eb662d', '#ef8354', '#000', '#fff'];

for (const hex of BLUE) {
  test(`${hex} is blue`, () => {
    const [r, g, b, a] = parseColor(hex);
    expect(isBlue(r, g, b, a)).toBe(true);
  });
}
for (const hex of NOT_BLUE) {
  test(`${hex} is not blue`, () => {
    const [r, g, b, a] = parseColor(hex);
    expect(isBlue(r, g, b, a)).toBe(false);
  });
}

test('a fully transparent blue is not blue; alpha defaults to 1', () => {
  expect(isBlue(58, 179, 223, 0)).toBe(false);
  expect(isBlue(58, 179, 223)).toBe(true);
  expect(isBlue(58, 179, 223, 0.5)).toBe(true);
});

test('parseColor reads #rgb, #rrggbb, #rrggbbaa, rgb() and rgba()', () => {
  expect(parseColor('#3AB3DF')).toEqual([58, 179, 223, 1]);
  expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
  expect(parseColor('#3ab3df80')).toEqual([58, 179, 223, 128 / 255]);
  expect(parseColor('rgb(58, 179, 223)')).toEqual([58, 179, 223, 1]);
  expect(parseColor('rgba(58,179,223,.5)')).toEqual([58, 179, 223, 0.5]);
  expect(parseColor('rgba(0, 0, 0, 0)')).toEqual([0, 0, 0, 0]);
});

test('blueLiterals lists the blue literals of a text, nothing else', () => {
  const css = `a { color: #3AB3DF; background: #02b5a0; border-color: #002642 }
    .x { box-shadow: 0 0 2px rgba(58, 179, 223, .5), 0 0 1px rgba(0,0,0,.2); fill: #fff }
    #main { color: #35414b } .y { color: rgb(0,123,255) }`;
  expect(blueLiterals(css)).toEqual(['#3AB3DF', '#002642', 'rgba(58, 179, 223, .5)', 'rgb(0,123,255)']);
});

test('blueLiterals does not read an entity or a longer word as a colour', () => {
  expect(blueLiterals('&#123; &#x3ab3df; #3ab3dfzz a#3ab3df')).toEqual([]);
});
