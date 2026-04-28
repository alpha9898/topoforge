export type Issue = {
  id: string;
  severity: "error" | "warning";
  code: string;
  message: string;
  entity_id?: string | null;
};

export type Port = {
  id: string;
  deviceId: string;
  name: string;
  side: string;
  order: number;
  speed?: string | null;
  vlan?: string | null;
};

export type Device = {
  id: string;
  name: string;
  hostname?: string | null;
  type: string;
  mgmtIp?: string | null;
  zone?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: Port[];
  aliases: string[];
};

export type Cable = {
  id: string;
  sourceDeviceId: string;
  sourcePort?: string | null;
  targetDeviceId: string;
  targetPort?: string | null;
  cableType: string;
  connectionRole: string;
  label: string;
  description?: string | null;
  confidence?: number | null;
  exitX: number;
  exitY: number;
  entryX: number;
  entryY: number;
};

export type TopologyResponse = {
  title: string;
  devices: Device[];
  cables: Cable[];
  issues: Issue[];
  zones: string[];
  legend: string[];
  notes: string[];
  aiSuggestions?: AiSuggestions | null;
};

export type AiAliasSuggestion = {
  alias: string;
  canonical: string;
  confidence: number;
  reason: string;
  applied?: boolean;
};

export type AiIgnoredConnection = {
  source?: string | null;
  signature?: string | null;
  confidence: number;
  reason: string;
};

export type AiSuggestions = {
  source: string;
  status: string;
  message?: string;
  alias_suggestions: AiAliasSuggestion[];
  device_type_suggestions: Record<string, unknown>[];
  ignored_connections: AiIgnoredConnection[];
  connection_enrichment?: AiConnectionEnrichment[];
  duplicate_devices: Record<string, unknown>[];
};

export type AiConnectionEnrichment = {
  cable_id: string;
  role: string;
  cableType: string;
  label: string;
  description?: string | null;
  confidence?: number | null;
};

export type ProjectUploadResponse = {
  project_id: string;
  status: "uploaded";
};

export type ClarificationQuestion = {
  id: string;
  type: string;
  message: string;
  suggested_answer?: string | null;
  entity_id?: string | null;
  options: string[];
};

export type GenerateResponse = {
  status: "generated";
  drawio_url: string;
};
