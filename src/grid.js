export const SIZE = 16;
export const PIXEL_COUNT = SIZE * SIZE;
export const HISTORY_LIMIT = 32;

function checkPixels(pixels) {
  if (!Array.isArray(pixels) || pixels.length !== PIXEL_COUNT) {
    throw new TypeError('Expected a 16 by 16 pixel array.');
  }
  for (const color of pixels) {
    if (color !== null && !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new TypeError('Pixels must be empty or six-digit hex colors.');
    }
  }
}

export function createState(pixels = Array(PIXEL_COUNT).fill(null)) {
  checkPixels(pixels);
  return { pixels: [...pixels], history: [] };
}

export function samplePixels() {
  const pixels = Array(PIXEL_COUNT).fill(null);
  const rows = [
    '................',
    '................',
    '......oo........',
    '.....oooo.......',
    '....ooyyoo......',
    '....ooyyoo......',
    '.....oooo.......',
    '......oo........',
    '.......g........',
    '....gg.g........',
    '.....ggg........',
    '.......ggg......',
    '.......g.gg.....',
    '.......g........',
    '.......g........',
    '................',
  ];
  const colors = { o: '#ed8936', y: '#f6d55c', g: '#39804c' };
  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      pixels[y * SIZE + x] = colors[character] ?? null;
    });
  });
  return pixels;
}

function commit(state, pixels) {
  if (pixels.every((color, index) => color === state.pixels[index])) return state;
  const history = [...state.history, state.pixels].slice(-HISTORY_LIMIT);
  return { pixels, history };
}

export function gridReducer(state, action) {
  switch (action.type) {
    case 'paint': {
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= PIXEL_COUNT) {
        throw new RangeError('Pixel index is outside the grid.');
      }
      if (action.color !== null && !/^#[0-9a-f]{6}$/i.test(action.color)) {
        throw new TypeError('Use a six-digit hex color.');
      }
      const pixels = [...state.pixels];
      pixels[action.index] = action.color?.toLowerCase() ?? null;
      return commit(state, pixels);
    }
    case 'clear':
      return commit(state, Array(PIXEL_COUNT).fill(null));
    case 'sample':
      return commit(state, samplePixels());
    case 'undo': {
      if (state.history.length === 0) return state;
      return { pixels: state.history.at(-1), history: state.history.slice(0, -1) };
    }
    default:
      throw new TypeError('Unknown grid action.');
  }
}

export function nextCell(index, key) {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  switch (key) {
    case 'ArrowLeft': return row * SIZE + Math.max(0, column - 1);
    case 'ArrowRight': return row * SIZE + Math.min(SIZE - 1, column + 1);
    case 'ArrowUp': return Math.max(0, row - 1) * SIZE + column;
    case 'ArrowDown': return Math.min(SIZE - 1, row + 1) * SIZE + column;
    default: return index;
  }
}

export function toSvg(pixels) {
  checkPixels(pixels);
  const rectangles = pixels.flatMap((color, index) => color === null ? [] : [
    `  <rect x="${index % SIZE}" y="${Math.floor(index / SIZE)}" width="1" height="1" fill="${color.toLowerCase()}"/>`,
  ]);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 16 16" shape-rendering="crispEdges">',
    ...rectangles,
    '</svg>',
    '',
  ].join('\n');
}
