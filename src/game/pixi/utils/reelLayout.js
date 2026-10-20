export function reelMetrics(width, height) {
  return { gap:3, cellWidth:(width-12)/5, cellHeight:height/3 };
}
// One continuous mask per column; row centers stay fixed during responsive layout.
export function reelLayout(width, height) {
  const { gap,cellWidth,cellHeight } = reelMetrics(width,height);
  const size = Math.max(1, Math.min(cellWidth, cellHeight) - 12);
  return Array.from({ length: 15 }, (_, i) => ({
    x: (i % 5) * (cellWidth + gap), y: Math.floor(i / 5) * cellHeight,
    width: cellWidth, height: cellHeight, size,
  }));
}
