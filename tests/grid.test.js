import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, gridReducer, nextCell, toSvg, samplePixels, HISTORY_LIMIT } from '../src/grid.js';

const paint = (state, index, color) => gridReducer(state, { type: 'paint', index, color });

test('a new grid is empty and independent from supplied pixels', () => {
  const pixels = Array(256).fill(null);
  const state = createState(pixels);
  pixels[0] = '#ffffff';
  assert.equal(state.pixels.length, 256);
  assert.equal(state.pixels[0], null);
  assert.deepEqual(state.history, []);
});

test('painting normalizes color and preserves the previous state', () => {
  const initial = createState();
  const next = paint(initial, 255, '#A0b1C2');
  assert.equal(next.pixels[255], '#a0b1c2');
  assert.equal(initial.pixels[255], null);
  assert.deepEqual(gridReducer(next, { type: 'undo' }), initial);
});

test('painting the same color and clearing an empty grid keep history unchanged', () => {
  const initial = createState();
  assert.equal(gridReducer(initial, { type: 'clear' }), initial);
  const next = paint(initial, 2, '#123456');
  assert.equal(paint(next, 2, '#123456'), next);
  assert.equal(gridReducer(initial, { type: 'undo' }), initial);
});

test('eraser and clear are undoable changes', () => {
  const drawn = paint(createState(), 20, '#000000');
  const erased = paint(drawn, 20, null);
  assert.equal(erased.pixels[20], null);
  assert.deepEqual(gridReducer(erased, { type: 'undo' }), drawn);
  assert.deepEqual(gridReducer(gridReducer(drawn, { type: 'clear' }), { type: 'undo' }), drawn);
});

test('history keeps only the last 32 changes', () => {
  let state = createState();
  for (let i = 0; i < 40; i++) state = paint(state, i, '#123456');
  assert.equal(state.history.length, HISTORY_LIMIT);
  for (let i = 0; i < HISTORY_LIMIT; i++) state = gridReducer(state, { type: 'undo' });
  assert.equal(state.pixels.filter(Boolean).length, 8);
  assert.equal(gridReducer(state, { type: 'undo' }), state);
});

test('invalid indexes and unsafe colors are rejected', () => {
  for (const index of [-1, 256, 1.5, NaN, '2']) assert.throws(() => paint(createState(), index, '#123456'), RangeError);
  for (const color of ['red', '#123', '#1234567', '"/><script/>', undefined, 42]) assert.throws(() => paint(createState(), 0, color), TypeError);
  assert.throws(() => createState([null]), TypeError);
  assert.throws(() => createState(Array(256).fill('red')), TypeError);
});

test('sample is deterministic, independently allocated, and undoable', () => {
  const sample = samplePixels();
  assert.equal(sample.length, 256);
  assert.equal(sample[38], '#ed8936');
  assert.equal(sample[70], '#f6d55c');
  assert.equal(sample[135], '#39804c');
  sample[38] = null;
  assert.equal(samplePixels()[38], '#ed8936');
  const initial = createState();
  const loaded = gridReducer(initial, { type: 'sample' });
  assert.deepEqual(gridReducer(loaded, { type: 'undo' }), initial);
  assert.equal(gridReducer(loaded, { type: 'sample' }), loaded);
});

test('arrows move one cell and stop at each grid boundary', () => {
  assert.equal(nextCell(17, 'ArrowLeft'), 16);
  assert.equal(nextCell(17, 'ArrowRight'), 18);
  assert.equal(nextCell(17, 'ArrowUp'), 1);
  assert.equal(nextCell(17, 'ArrowDown'), 33);
  assert.equal(nextCell(16, 'ArrowLeft'), 16);
  assert.equal(nextCell(15, 'ArrowRight'), 15);
  assert.equal(nextCell(0, 'ArrowUp'), 0);
  assert.equal(nextCell(255, 'ArrowDown'), 255);
  assert.equal(nextCell(6, 'Enter'), 6);
});

test('SVG describes the exact painted cells and omits empty cells', () => {
  let state = paint(createState(), 0, '#ABCDEF');
  state = paint(state, 255, '#123456');
  const svg = toSvg(state.pixels);
  assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 16 16"/);
  assert.match(svg, /<rect x="0" y="0" width="1" height="1" fill="#abcdef"\/>/);
  assert.match(svg, /<rect x="15" y="15" width="1" height="1" fill="#123456"\/>/);
  assert.equal((svg.match(/<rect /g) ?? []).length, 2);
  assert.equal((toSvg(createState().pixels).match(/<rect /g) ?? []).length, 0);
});

test('SVG export validates data instead of emitting arbitrary markup', () => {
  const pixels = Array(256).fill(null);
  pixels[5] = '#000000" onload="alert(1)';
  assert.throws(() => toSvg(pixels), TypeError);
  assert.throws(() => toSvg(Array(255).fill(null)), TypeError);
});
