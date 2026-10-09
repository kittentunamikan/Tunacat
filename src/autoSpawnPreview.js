export function predictSpawns(state) {
  const { width, height, players, isLand, isOccupied } = state;
  let seed = state.seed;
  const random = () => (seed = 167 * seed % 32768);
  const columns = Math.floor(width / 10);
  const rows = Math.floor(height / 10);
  if (!columns || !rows) return [];
  const offsetX = Math.floor((width - columns * 10) / 2);
  const offsetY = Math.floor((height - rows * 10) / 2);
  const reserved = new Set();
  const points = [];
  const valid = (column, row) => {
    const left = offsetX + column * 10 + 2;
    const top = offsetY + row * 10 + 2;
    for (let y = top + 5; y >= top; y--) {
      for (let x = left + 5; x >= left; x--) {
        if (!isLand(x, y) || isOccupied(x, y) || reserved.has(y * width + x)) return false;
      }
    }
    return true;
  };
  for (const player of players) {
    let cell = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const column = Math.floor(columns * random() / 32768);
      const row = Math.floor(rows * random() / 32768);
      if (valid(column, row)) { cell = [column, row]; break; }
    }
    if (!cell) {
      const dx = Math.floor(columns * random() / 32768);
      const dy = Math.floor(rows * random() / 32768);
      search: for (let sy = 40; sy >= 1; sy--) {
        for (let y = rows - sy; y >= 0; y -= 40) {
          const row = (y + dy) % rows;
          for (let sx = 40; sx >= 1; sx--) {
            for (let x = columns - sx; x >= 0; x -= 40) {
              const column = (x + dx) % columns;
              if (valid(column, row)) { cell = [column, row]; break search; }
            }
          }
        }
      }
    }
    if (!cell) continue;
    const left = offsetX + cell[0] * 10 + 3;
    const top = offsetY + cell[1] * 10 + 3;
    // Reserve the same 12-cell cross as the game's automatic allocator.
    for (let x = left; x < left + 4; x++) {
      for (let y = top; y < top + 4; y++) {
        if ((x > left && x < left + 3) || (y > top && y < top + 3)) reserved.add(y * width + x);
      }
    }
    points.push({ player, x: left + 2, y: top + 2 });
  }
  return points;
}

let nextUpdate = 0;
let cached = [];
let map = null;
export default {
  render(ctx, state) {
    if (!state.enabled) { cached = []; nextUpdate = 0; map = null; return; }
    const now = performance.now();
    if (map !== state.map || now >= nextUpdate) {
      cached = predictSpawns(state);
      map = state.map;
      nextUpdate = now + 250;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const size = Math.max(1, Math.min(2, Math.sqrt(state.zoom)));
    const fontSize = 12 * size;
    const radius = 10 * size;
    ctx.font = fontSize + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = '#42e8d5';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2 * size;
    for (const point of cached) {
      if (!state.players.includes(point.player)) continue;
      const x = point.x * state.zoom - state.panX;
      const y = point.y * state.zoom - state.panY;
      if (x < 0 || y < 0 || x > ctx.canvas.width || y > ctx.canvas.height) continue;
      ctx.setLineDash([4 * size, 3 * size]);
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const label = 'AUTO? ' + state.names[point.player];
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3 * size;
      const labelWidth = Math.min(ctx.measureText(label).width, ctx.canvas.width - 8);
      const labelX = Math.max(labelWidth / 2 + 4, Math.min(x, ctx.canvas.width - labelWidth / 2 - 4));
      const labelY = Math.max(fontSize + 4, y - radius - 3 * size);
      ctx.strokeText(label, labelX, labelY, Math.max(1, ctx.canvas.width - 8));
      ctx.fillText(label, labelX, labelY, Math.max(1, ctx.canvas.width - 8));
      ctx.strokeStyle = '#42e8d5'; ctx.lineWidth = 2 * size;
    }
    ctx.restore();
  }
};
