// Pure geometry shared with regression tests: keep every sprite within its cell.
export function reelLayout(width, height) {
  const gap = 3, cellWidth = (width - gap * 4) / 5, cellHeight = (height - gap * 2) / 3;
  const size = Math.max(1, Math.min(cellWidth, cellHeight) - 12);
  return Array.from({ length: 15 }, (_, i) => ({
    x: (i % 5) * (cellWidth + gap), y: Math.floor(i / 5) * (cellHeight + gap),
    width: cellWidth, height: cellHeight, size,
  }));
}
