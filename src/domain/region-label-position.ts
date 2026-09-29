import type { Position } from '../api';

/** Place the label inside the widest horizontal slice through the region. */
export function regionLabelPosition(polygon: Position[]): Position {
  if (polygon.length < 3) return polygon[0] ?? [0, 0];
  const latitudes = polygon.map((point) => point[1]);
  const middleLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const intersections: number[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if ((start[1] <= middleLatitude && end[1] > middleLatitude) ||
        (end[1] <= middleLatitude && start[1] > middleLatitude)) {
      intersections.push(start[0] + (middleLatitude - start[1]) * (end[0] - start[0]) / (end[1] - start[1]));
    }
  }
  intersections.sort((a, b) => a - b);
  let widest: Position = [(Math.min(...polygon.map((point) => point[0])) + Math.max(...polygon.map((point) => point[0]))) / 2, middleLatitude];
  let width = -1;
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const nextWidth = intersections[index + 1] - intersections[index];
    if (nextWidth > width) { width = nextWidth; widest = [(intersections[index] + intersections[index + 1]) / 2, middleLatitude]; }
  }
  return widest;
}
