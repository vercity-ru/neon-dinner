export function symbolGeometry(bounds, cellWidth, cellHeight, centerY, reelHeight) {
  const scale = Math.min(cellWidth*.82/bounds.width, cellHeight*.82/bounds.height);
  // A very gentle cylinder: the middle row faces the player; outer rows turn away.
  const distance = Math.min(1,Math.abs(centerY-reelHeight/2)/(reelHeight/2));
  return { scaleX:scale, scaleY:scale*(1-.075*distance*distance), centerX:cellWidth/2, centerY };
}
