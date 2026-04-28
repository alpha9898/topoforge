"use client";

import type { TopologyResponse } from "./types";

const PROJECT_ID_KEY = "topoforge.projectId";
const TOPOLOGY_KEY = "topoforge.topology";
const DRAWIO_URL_KEY = "topoforge.drawioUrl";
const AI_HELPER_KEY = "topoforge.useAiHelper";
const AI_INCLUDE_IPS_KEY = "topoforge.includeIpsInAi";

export function saveProjectId(projectId: string) {
  localStorage.setItem(PROJECT_ID_KEY, projectId);
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
