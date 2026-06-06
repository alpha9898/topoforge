// Pure geometry helpers shared by the interactive canvas (TopologyCanvas) and the
// image exporter (diagram-export). Keeping these in one place guarantees the
// exported picture matches the on-screen diagram exactly.
//
// Coordinates mirror the Draw.io generator: edges anchor to the centered shape
// box (see backend/services/drawio_generator.py).

import type { Cable, Device } from "@/lib/types";
import { deviceShapeSize } from "@/lib/diagram-theme";

export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export function shapeBox(device: Device): Box {
  const [w, h] = deviceShapeSize(device.type);
  return { x: device.x + Math.max(0, (device.width - w) / 2), y: device.y, w, h };
}

export function anchor(box: Box, fx: number, fy: number): Pt {
  return { x: box.x + fx * box.w, y: box.y + fy * box.h };
}

// Mirror drawio_generator._parallel_cable_offsets (primary device-pair grouping).
export function parallelOffsets(cables: Cable[]): Map<string, number> {
  const groups = new Map<string, Cable[]>();
  for (const cable of cables) {
    const pair = [cable.sourceDeviceId, cable.targetDeviceId].sort().join("|");
    const arr = groups.get(pair);
    if (arr) arr.push(cable);
    else groups.set(pair, [cable]);
  }
  const offsets = new Map<string, number>();
  for (const arr of groups.values()) {
    if (arr.length <= 1) {
      if (arr.length === 1) offsets.set(arr[0].id, 0);
      continue;
    }
    const step = Math.min(54, 28 + arr.length * 3);
    const start = -((arr.length - 1) * step) / 2;
    arr.forEach((cable, index) => offsets.set(cable.id, start + index * step));
  }
  return offsets;
}

export function cablePath(src: Pt, tgt: Pt, offset: number): string {
  if (!offset) return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const len = Math.max(Math.hypot(dx, dy), 1);
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (src.x + tgt.x) / 2 + nx * offset;
  const my = (src.y + tgt.y) / 2 + ny * offset;
  return `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`;
}

export function computeDiagramBounds(devices: Device[]): Box {
  if (devices.length === 0) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const device of devices) {
    const box = shapeBox(device);
    // Include the label area drawn below each shape.
    minX = Math.min(minX, box.x, device.x - 20);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w, device.x + device.width + 20);
    maxY = Math.max(maxY, box.y + box.h + 44);
  }
  return { x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1) };
}
