// Client-side export of the topology diagram to SVG / PNG / PDF.
//
// We build a standalone, self-contained SVG string from the same geometry the
// interactive canvas uses (so the picture matches the screen), with concrete
// colors (no CSS variables) and no animation. PNG rasterizes that SVG via a
// <canvas>; PDF embeds the PNG via jsPDF (loaded on demand).

import type { TopologyResponse } from "@/lib/types";
import { cableVisual, deviceVisual } from "@/lib/diagram-theme";
import { anchor, cablePath, computeDiagramBounds, parallelOffsets, shapeBox } from "@/lib/diagram-geometry";

const TITLE_COLOR = "#0f172a";
const LABEL_COLOR = "#1f2937";
const SUBLABEL_COLOR = "#64748b";
const FAINT_COLOR = "#94a3b8";
const UNKNOWN_STROKE = "#64748b";

export type SvgExport = { svg: string; width: number; height: number };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// CSS-variable colors (only the `unknown` cable role) can't appear in a
// standalone file — resolve them to a concrete hex.
function resolveColor(color: string): string {
  return color.startsWith("var(") ? UNKNOWN_STROKE : color;
}

function uniqueRoles(topology: TopologyResponse): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const cable of topology.cables) {
    if (!seen.has(cable.connectionRole)) {
      seen.add(cable.connectionRole);
      ordered.push(cable.connectionRole);
    }
  }
  return ordered;
}

export function topologyToSvgString(topology: TopologyResponse, options: { background?: string } = {}): SvgExport {
  const devices = topology.devices;
  const bounds = computeDiagramBounds(devices);
  const offsets = parallelOffsets(topology.cables);
  const deviceMap = new Map(devices.map((device) => [device.id, device]));
  const roles = uniqueRoles(topology);

  const pad = 32;
  const titleH = topology.title ? 40 : 0;
  const legendH = roles.length ? 30 : 0;

  const legendItemWidth = (label: string) => 30 + label.length * 6.8;
  const legendWidth = roles.reduce((sum, role) => sum + legendItemWidth(cableVisual(role).label) + 14, 0);
  const titleWidth = (topology.title?.length ?? 0) * 11;
  const contentWidth = Math.max(bounds.w, legendWidth, titleWidth);

  const minX = bounds.x - pad;
  const minY = bounds.y - pad - titleH;
  const width = Math.round(contentWidth + pad * 2);
  const height = Math.round(bounds.h + pad * 2 + titleH + legendH);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">`,
  );
  if (options.background) {
    parts.push(`<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${options.background}"/>`);
  }
  if (topology.title) {
    parts.push(`<text x="${bounds.x}" y="${minY + 26}" font-size="20" font-weight="700" fill="${TITLE_COLOR}">${escapeXml(topology.title)}</text>`);
  }

  // Cables (under devices)
  for (const cable of topology.cables) {
    const source = deviceMap.get(cable.sourceDeviceId);
    const target = deviceMap.get(cable.targetDeviceId);
    if (!source || !target) continue;
    const src = anchor(shapeBox(source), cable.exitX, cable.exitY);
    const tgt = anchor(shapeBox(target), cable.entryX, cable.entryY);
    const d = cablePath(src, tgt, offsets.get(cable.id) ?? 0);
    const visual = cableVisual(cable.connectionRole);
    const dash = visual.dashed ? ` stroke-dasharray="6 5"` : "";
    parts.push(`<path d="${d}" fill="none" stroke="${resolveColor(visual.color)}" stroke-width="2" stroke-linecap="round"${dash}/>`);
  }

  // Devices (over cables)
  for (const device of devices) {
    const box = shapeBox(device);
    const visual = deviceVisual(device.type);
    const cx = box.x + box.w / 2;
    const labelY = box.y + box.h + 16;
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8" fill="${visual.color}" fill-opacity="0.15" stroke="${visual.color}" stroke-width="1.5"/>`,
    );
    parts.push(`<text x="${cx}" y="${labelY}" text-anchor="middle" font-size="12" font-weight="600" fill="${LABEL_COLOR}">${escapeXml(device.name)}</text>`);
    parts.push(`<text x="${cx}" y="${labelY + 13}" text-anchor="middle" font-size="9" fill="${SUBLABEL_COLOR}">${escapeXml(visual.label.toUpperCase())}</text>`);
    if (device.mgmtIp) {
      parts.push(`<text x="${cx}" y="${labelY + 26}" text-anchor="middle" font-size="9" fill="${FAINT_COLOR}">${escapeXml(device.mgmtIp)}</text>`);
    }
  }

  // Legend
  if (roles.length) {
    let lx = bounds.x;
    const ly = bounds.y + bounds.h + pad + 6;
    for (const role of roles) {
      const visual = cableVisual(role);
      const dash = visual.dashed ? ` stroke-dasharray="4 3"` : "";
      parts.push(`<line x1="${lx}" y1="${ly}" x2="${lx + 22}" y2="${ly}" stroke="${resolveColor(visual.color)}" stroke-width="2.5"${dash}/>`);
      parts.push(`<text x="${lx + 28}" y="${ly + 4}" font-size="11" fill="${SUBLABEL_COLOR}">${escapeXml(visual.label)}</text>`);
      lx += legendItemWidth(visual.label) + 14;
    }
  }

  parts.push(`</svg>`);
  return { svg: parts.join(""), width, height };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchorEl = document.createElement("a");
  anchorEl.href = url;
  anchorEl.download = filename;
  document.body.appendChild(anchorEl);
  anchorEl.click();
  anchorEl.remove();
  URL.revokeObjectURL(url);
}

export function exportSvg(topology: TopologyResponse): void {
  const { svg } = topologyToSvgString(topology);
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "topoforge-topology.svg");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render SVG to image"));
    img.src = src;
  });
}

export async function topologyToPng(topology: TopologyResponse, scale = 2): Promise<{ blob: Blob; width: number; height: number }> {
  const { svg, width, height } = topologyToSvgString(topology, { background: "#ffffff" });
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG encoding failed");
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function exportPng(topology: TopologyResponse): Promise<void> {
  const { blob } = await topologyToPng(topology);
  downloadBlob(blob, "topoforge-topology.png");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read PNG blob"));
    reader.readAsDataURL(blob);
  });
}

export async function exportPdf(topology: TopologyResponse): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { blob, width, height } = await topologyToPng(topology);
  const dataUrl = await blobToDataUrl(blob);
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: [width, height] });
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  pdf.save("topoforge-topology.pdf");
}
