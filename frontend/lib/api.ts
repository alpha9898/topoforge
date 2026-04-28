import type { ClarificationQuestion, GenerateResponse, ProjectUploadResponse, TopologyResponse } from "./types";

const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export function getApiBase(): string {
  if (CONFIGURED_API_BASE) {
    return CONFIGURED_API_BASE.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8001`;
  }
  return "http://localhost:8001";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function uploadFile(file: File): Promise<ProjectUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<ProjectUploadResponse>("/api/upload", { method: "POST", body: form });
}

export async function parseProject(projectId: string, options?: { use_ai_helper?: boolean; include_ips_in_ai?: boolean }): Promise<TopologyResponse> {
  return request<TopologyResponse>(`/api/projects/${projectId}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {})
  });
}

export async function applyTopologyCorrections(
  projectId: string,
  corrections: {
    device_updates: { id: string; name?: string; type?: string; mgmtIp?: string; zone?: string }[];
    removed_device_ids: string[];
    added_devices: { name: string; type: string; mgmtIp?: string; zone?: string }[];
  }
): Promise<TopologyResponse> {
  return request<TopologyResponse>(`/api/projects/${projectId}/corrections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corrections)
  });
}

export async function getClarifications(projectId: string): Promise<{ questions: ClarificationQuestion[] }> {
  return request<{ questions: ClarificationQuestion[] }>(`/api/projects/${projectId}/clarifications`);
}

export async function submitClarifications(projectId: string, answers: { question_id: string; answer: string }[]): Promise<TopologyResponse> {
  return request<TopologyResponse>(`/api/projects/${projectId}/clarifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers })
  });
}

export async function generateDrawio(projectId: string): Promise<GenerateResponse> {
  return request<GenerateResponse>(`/api/projects/${projectId}/generate`, { method: "POST" });
}

export function downloadUrl(path: string): string {
  return path.startsWith("http") ? path : `${getApiBase()}${path}`;
}

export async function downloadDrawioFile(path: string, filename = "topoforge-hld.drawio"): Promise<void> {
  const response = await fetch(downloadUrl(path));
  if (!response.ok) {
    throw new Error("Could not download generated Draw.io file");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
