import React, { useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SIZE, createState, gridReducer, nextCell, toSvg } from './grid.js';
import './style.css';

function App() {
  const [state, dispatch] = useReducer(gridReducer, undefined, createState);
  const [color, setColor] = useState('#2767a8');
  const [eraser, setEraser] = useState(false);
  const [focused, setFocused] = useState(0);
  const cells = useRef([]);

  function downloadSvg() {
    const url = URL.createObjectURL(new Blob([toSvg(state.pixels)], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pixel-grid.svg';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function move(event, index) {
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const target = nextCell(index, event.key);
    setFocused(target);
    cells.current[target]?.focus();
  }

  return (
    <main>
      <h1>Pixel Grid</h1>
      <p>Draw on a 16 × 16 grid and save it as an SVG.</p>
      <div className="controls">
        <label className="color-label">Color <input type="color" value={color} onInput={event => setColor(event.currentTarget.value)} onChange={event => setColor(event.target.value)} /></label>
        <label><input type="checkbox" checked={eraser} onChange={event => setEraser(event.target.checked)} /> Eraser</label>
        <button onClick={() => dispatch({ type: 'undo' })} disabled={state.history.length === 0}>Undo</button>
        <button onClick={() => dispatch({ type: 'clear' })}>Clear</button>
        <button onClick={() => dispatch({ type: 'sample' })}>Load sample</button>
        <button onClick={downloadSvg}>Download SVG</button>
      </div>
      <p id="grid-help" className="help">Click to paint. Use arrow keys to move, then Space or Enter to paint.</p>
      <div className="grid" role="grid" aria-label="Pixel drawing" aria-describedby="grid-help" aria-rowcount={SIZE} aria-colcount={SIZE}>
        {Array.from({ length: SIZE }, (_, row) => (
          <div role="row" key={row}>
            {Array.from({ length: SIZE }, (_, column) => {
              const index = row * SIZE + column;
              const pixel = state.pixels[index];
              return <button
                key={column}
                ref={element => { cells.current[index] = element; }}
                role="gridcell"
                aria-label={`Row ${row + 1}, column ${column + 1}, ${pixel ?? 'empty'}`}
                aria-rowindex={row + 1}
                aria-colindex={column + 1}
                tabIndex={focused === index ? 0 : -1}
                style={{ backgroundColor: pixel ?? '#ffffff' }}
                onFocus={() => setFocused(index)}
                onKeyDown={event => move(event, index)}
                onClick={() => dispatch({ type: 'paint', index, color: eraser ? null : color })}
              />;
            })}
          </div>
        ))}
      </div>
      <p className="help">Empty cells export as transparent. Undo keeps the last 32 changes. Refreshing clears the drawing.</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
