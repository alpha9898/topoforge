"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { Cable, Device, TopologyResponse } from "@/lib/types";
import { cableVisual, deviceShapeSize, deviceVisual } from "@/lib/diagram-theme";

type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
type View = { k: number; t: Pt };
type Tooltip = { x: number; y: number; title: string; lines: string[]; color: string };

type Props = {
  topology: TopologyResponse;
  compact?: boolean;
  highlightDeviceId?: string | null;
  onSelectDevice?: (deviceId: string) => void;
};

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

// The centered shape box that Draw.io edges anchor to (see drawio_generator._add_device).
function shapeBox(device: Device): Box {
  const [w, h] = deviceShapeSize(device.type);
  return { x: device.x + Math.max(0, (device.width - w) / 2), y: device.y, w, h };
}

function anchor(box: Box, fx: number, fy: number): Pt {
  return { x: box.x + fx * box.w, y: box.y + fy * box.h };
}

// Mirror drawio_generator._parallel_cable_offsets (primary device-pair grouping).
function parallelOffsets(cables: Cable[]): Map<string, number> {
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

function cablePath(src: Pt, tgt: Pt, offset: number): string {
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

function computeFit(bounds: Box, size: { w: number; h: number }, pad = 48): View {
  const raw = Math.min((size.w - pad * 2) / bounds.w, (size.h - pad * 2) / bounds.h, 1.5);
  const k = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return {
    k,
    t: { x: size.w / 2 - k * (bounds.x + bounds.w / 2), y: size.h / 2 - k * (bounds.y + bounds.h / 2) },
  };
}

export function TopologyCanvas({ topology, compact = false, highlightDeviceId, onSelectDevice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ active: boolean; moved: boolean; last: Pt }>({ active: false, moved: false, last: { x: 0, y: 0 } });

  const height = compact ? 340 : 560;
  const [size, setSize] = useState({ w: 960, h: height });
  const [view, setView] = useState<View>({ k: 1, t: { x: 0, y: 0 } });
  const [hoverDevice, setHoverDevice] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const deviceMap = useMemo(() => new Map(topology.devices.map((d) => [d.id, d])), [topology.devices]);
  const bounds = useMemo(() => computeDiagramBounds(topology.devices), [topology.devices]);
  const offsets = useMemo(() => parallelOffsets(topology.cables), [topology.cables]);
  const roles = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const cable of topology.cables) {
      if (!seen.has(cable.connectionRole)) {
        seen.add(cable.connectionRole);
        ordered.push(cable.connectionRole);
      }
    }
    return ordered;
  }, [topology.cables]);

  // Keep the viewBox locked to the element's pixel size so 1 screen px == 1 user unit.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit-to-bounds on load and whenever the topology or viewport size changes.
  useEffect(() => {
    setView(computeFit(bounds, size));
  }, [bounds, size]);

  // Wheel zoom centered on the cursor (native listener so we can preventDefault).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      setView((v) => {
        const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
        const k = clamp(v.k * factor, 0.1, 4);
        const ratio = k / v.k;
        return { k, t: { x: cx - (cx - v.t.x) * ratio, y: cy - (cy - v.t.y) * ratio } };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setView((v) => {
        const k = clamp(v.k * factor, 0.1, 4);
        const ratio = k / v.k;
        const cx = size.w / 2;
        const cy = size.h / 2;
        return { k, t: { x: cx - (cx - v.t.x) * ratio, y: cy - (cy - v.t.y) * ratio } };
      });
    },
    [size.w, size.h],
  );

  const fit = useCallback(() => setView(computeFit(bounds, size)), [bounds, size]);

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = { active: true, moved: false, last: { x: event.clientX, y: event.clientY } };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.last.x;
    const dy = event.clientY - dragRef.current.last.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragRef.current.moved = true;
    dragRef.current.last = { x: event.clientX, y: event.clientY };
    setView((v) => ({ k: v.k, t: { x: v.t.x + dx, y: v.t.y + dy } }));
  }

  function endPan(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current.active = false;
    svgRef.current?.releasePointerCapture?.(event.pointerId);
  }

  const showTip = useCallback((event: { clientX: number; clientY: number }, tip: Omit<Tooltip, "x" | "y">) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ ...tip, x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, []);

  const ariaLabel = `Network diagram preview: ${topology.devices.length} devices, ${topology.cables.length} links`;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-[var(--line)]"
      style={{
        height,
        backgroundColor: "var(--surface)",
        backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {topology.devices.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
          No devices to preview yet.
        </div>
      ) : (
        <svg
          ref={svgRef}
          role="img"
          aria-label={ariaLabel}
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerLeave={(e) => {
            endPan(e);
            setHoverDevice(null);
            setTooltip(null);
          }}
        >
          <g transform={`translate(${view.t.x} ${view.t.y}) scale(${view.k})`}>
            {/* Cables (under devices) */}
            {topology.cables.map((cable) => {
              const source = deviceMap.get(cable.sourceDeviceId);
              const target = deviceMap.get(cable.targetDeviceId);
              if (!source || !target) return null;
              const src = anchor(shapeBox(source), cable.exitX, cable.exitY);
              const tgt = anchor(shapeBox(target), cable.entryX, cable.entryY);
              const path = cablePath(src, tgt, offsets.get(cable.id) ?? 0);
              const visual = cableVisual(cable.connectionRole);
              const incident = hoverDevice != null && (cable.sourceDeviceId === hoverDevice || cable.targetDeviceId === hoverDevice);
              const dimmed = hoverDevice != null && !incident;
              return (
                <g key={cable.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) =>
                      showTip(e, {
                        title: cable.label || "Link",
                        color: visual.color.startsWith("var(") ? "var(--muted-strong)" : visual.color,
                        lines: [
                          `${source.name} ${cable.sourcePort ?? "?"} → ${target.name} ${cable.targetPort ?? "?"}`,
                          `Role: ${cable.connectionRole}`,
                        ],
                      })
                    }
                    onMouseMove={(e) =>
                      showTip(e, {
                        title: cable.label || "Link",
                        color: visual.color.startsWith("var(") ? "var(--muted-strong)" : visual.color,
                        lines: [
                          `${source.name} ${cable.sourcePort ?? "?"} → ${target.name} ${cable.targetPort ?? "?"}`,
                          `Role: ${cable.connectionRole}`,
                        ],
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                  <path
                    data-testid="cable"
                    d={path}
                    fill="none"
                    stroke={visual.color}
                    strokeWidth={incident ? 3.5 : 2}
                    strokeLinecap="round"
                    strokeDasharray={visual.dashed ? "6 5" : undefined}
                    opacity={dimmed ? 0.18 : 1}
                    style={{ pointerEvents: "none", transition: "opacity 120ms ease, stroke-width 120ms ease" }}
                  />
                </g>
              );
            })}

            {/* Devices (over cables) */}
            {topology.devices.map((device) => {
              const box = shapeBox(device);
              const visual = deviceVisual(device.type);
              const Icon = visual.Icon;
              const iconSize = clamp(Math.min(box.w, box.h) - 14, 16, 26);
              const active = hoverDevice === device.id || highlightDeviceId === device.id;
              const labelY = box.h + 16;
              const tipLines = [visual.label];
              if (device.mgmtIp) tipLines.push(device.mgmtIp);
              tipLines.push(`${device.ports.length} port${device.ports.length === 1 ? "" : "s"}`);
              return (
                <g
                  key={device.id}
                  data-testid="device"
                  transform={`translate(${box.x} ${box.y})`}
                  style={{ cursor: onSelectDevice ? "pointer" : "default" }}
                  onMouseEnter={(e) => {
                    setHoverDevice(device.id);
                    showTip(e, { title: device.name, color: visual.color, lines: tipLines });
                  }}
                  onMouseMove={(e) => showTip(e, { title: device.name, color: visual.color, lines: tipLines })}
                  onMouseLeave={() => {
                    setHoverDevice(null);
                    setTooltip(null);
                  }}
                  onClick={() => {
                    if (!dragRef.current.moved) onSelectDevice?.(device.id);
                  }}
                >
                  <rect
                    width={box.w}
                    height={box.h}
                    rx={8}
                    fill={visual.color}
                    fillOpacity={active ? 0.3 : 0.15}
                    stroke={visual.color}
                    strokeWidth={active ? 2.5 : 1.5}
                    style={{ transition: "fill-opacity 120ms ease, stroke-width 120ms ease" }}
                  />
                  <g transform={`translate(${box.w / 2 - iconSize / 2} ${box.h / 2 - iconSize / 2 - 2})`}>
                    <Icon width={iconSize} height={iconSize} color={visual.color} strokeWidth={2} />
                  </g>
                  <text x={box.w / 2} y={labelY} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text)" style={{ userSelect: "none" }}>
                    {device.name}
                  </text>
                  {device.mgmtIp && !compact && (
                    <text x={box.w / 2} y={labelY + 14} textAnchor="middle" fontSize={10} fill="var(--muted)" style={{ userSelect: "none" }}>
                      {device.mgmtIp}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Legend */}
      {roles.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[60%] flex-wrap gap-x-3 gap-y-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] text-[var(--muted)] shadow-sm">
          {roles.map((role) => {
            const visual = cableVisual(role);
            return (
              <span key={role} className="inline-flex items-center gap-1.5">
                <svg width={18} height={6} aria-hidden>
                  <line
                    x1={0}
                    y1={3}
                    x2={18}
                    y2={3}
                    stroke={visual.color}
                    strokeWidth={2.5}
                    strokeDasharray={visual.dashed ? "4 3" : undefined}
                  />
                </svg>
                {visual.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <CanvasButton label="Zoom in" onClick={() => zoomBy(1.2)}>
          <ZoomIn aria-hidden size={15} />
        </CanvasButton>
        <CanvasButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          <ZoomOut aria-hidden size={15} />
        </CanvasButton>
        <CanvasButton label="Fit to screen" onClick={fit}>
          <Maximize2 aria-hidden size={15} />
        </CanvasButton>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[260px] rounded-md border border-[var(--line)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: clamp(tooltip.x + 12, 4, size.w - 200), top: clamp(tooltip.y + 12, 4, height - 60) }}
        >
          <p className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tooltip.color }} aria-hidden />
            {tooltip.title}
          </p>
          {tooltip.lines.map((line, index) => (
            <p key={index} className="text-[var(--muted)]">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CanvasButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]"
    >
      {children}
    </button>
  );
}
