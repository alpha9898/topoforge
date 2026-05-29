"use client";

import type { TopologyResponse } from "./types";

const PROJECT_ID_KEY = "topoforge.projectId";
const TOPOLOGY_KEY = "topoforge.topology";
const DRAWIO_URL_KEY = "topoforge.drawioUrl";
const AI_HELPER_KEY = "topoforge.useAiHelper";
const AI_INCLUDE_IPS_KEY = "topoforge.includeIpsInAi";
const PROJECT_CREATED_AT_KEY = "topoforge.projectCreatedAt";

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const SESSION_WARN_MS = 5.5 * 60 * 60 * 1000;

export function saveProjectId(projectId: string) {
  localStorage.setItem(PROJECT_ID_KEY, projectId);
  localStorage.setItem(PROJECT_CREATED_AT_KEY, String(Date.now()));
}

export function sessionExpiryState(): "ok" | "expiring_soon" | "expired" {
  const raw = localStorage.getItem(PROJECT_CREATED_AT_KEY);
  if (!raw) return "ok";
  const elapsed = Date.now() - Number(raw);
  if (elapsed >= SESSION_TTL_MS) return "expired";
  if (elapsed >= SESSION_WARN_MS) return "expiring_soon";
  return "ok";
}

export function loadProjectId(): string | null {
  return localStorage.getItem(PROJECT_ID_KEY);
}

export function saveTopology(topology: TopologyResponse) {
  localStorage.setItem(TOPOLOGY_KEY, JSON.stringify(topology));
}

export function loadTopology(): TopologyResponse | null {
  const raw = localStorage.getItem(TOPOLOGY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TopologyResponse;
  } catch {
    return null;
  }
}

export function saveDrawioUrl(url: string) {
  localStorage.setItem(DRAWIO_URL_KEY, url);
}

export function loadDrawioUrl(): string | null {
  return localStorage.getItem(DRAWIO_URL_KEY);
}

export function resetProjectState() {
  localStorage.removeItem(PROJECT_ID_KEY);
  localStorage.removeItem(TOPOLOGY_KEY);
  localStorage.removeItem(DRAWIO_URL_KEY);
  localStorage.removeItem(PROJECT_CREATED_AT_KEY);
}

export function saveAiPreferences(useAiHelper: boolean, includeIpsInAi: boolean) {
  localStorage.setItem(AI_HELPER_KEY, String(useAiHelper));
  localStorage.setItem(AI_INCLUDE_IPS_KEY, String(includeIpsInAi));
}

export function loadAiPreferences(): { useAiHelper: boolean; includeIpsInAi: boolean } {
  return {
    useAiHelper: localStorage.getItem(AI_HELPER_KEY) === "true",
    includeIpsInAi: localStorage.getItem(AI_INCLUDE_IPS_KEY) === "true"
  };
}
