const API_BASE = '/api';

export interface Alert {
  entity_id: string;
  entity_type: string;
  promise_description: string;
  promise_type: string;
  entropy_score: number;
  days_elapsed: number;
  due_date: string | null;
  severity: "critical" | "high" | "medium" | "low";
  made_by: string;
  event_extracted_at: string;
}

export interface Summary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Entity {
  entity_id: string;
  entity_type: string;
  state: string;
  event_count: number;
  last_interaction: string;
  open_promises: number;
}

export interface TimelineEvent {
  timestamp: string;
  event_type: string;
  sentiment: string;
  sentiment_intensity: number;
  raw_text: string;
  erp_tags: string[];
  relationship_signals: string[];
  entities_mentioned: string[];
  promises: any[];
}

export interface Commitment {
  description: string;
  promise_type: string;
  made_by: string;
  due_date: string | null;
  urgency_weight: number;
  resolved: boolean;
  entropy_score: number;
  severity: string;
  recorded_at: string;
}

export interface IngestRequest {
  text: string;
  entity_id: string;
  entity_type: string;
  date?: string;
}

export interface IngestResponse {
  status: string;
  entity_id: string;
  event_type: string;
  sentiment: string;
  sentiment_intensity: number;
  promises_found: number;
  relationship_state: string;
  erp_tags: string[];
  relationship_signals: string[];
  cognee_status: string;
}

export interface Conflict {
  id: number;
  entity_id: string;
  attribute_type: string;
  source_a: string;
  value_a: string;
  event_id_a: number;
  source_b: string;
  value_b: string;
  event_id_b: number;
  detected_at: string;
  resolved: number;
}

export interface EntropyEntry {
  entity_id: string;
  entity_name: string;
  entropy_score: number;
}

export const api = {
  getAlerts: async () => {
    const res = await fetch(`${API_BASE}/alerts`);
    return res.json() as Promise<{ alerts: Alert[], summary: Summary, at_risk_entities: any[] }>;
  },
  getEntities: async () => {
    const res = await fetch(`${API_BASE}/entities`);
    return res.json() as Promise<{ entities: Entity[], total: number }>;
  },
  getTimeline: async (id: string) => {
    const res = await fetch(`${API_BASE}/customer/${id}/timeline`);
    return res.json() as Promise<{ entity_id: string, relationship_state: string, event_count: number, timeline: TimelineEvent[] }>;
  },
  getCommitments: async (id: string) => {
    const res = await fetch(`${API_BASE}/customer/${id}/commitments`);
    return res.json() as Promise<{ total_promises: number, open_count: number, commitments: Commitment[] }>;
  },
  queryEntity: async (id: string, query: string) => {
    const res = await fetch(`${API_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: id, query })
    });
    return res.json() as Promise<{ answer: string, search_mode: string }>;
  },
  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/import-csv`, {
      method: "POST",
      body: formData
    });
    return res.json() as Promise<{ total_rows: number, imported: number, errors: number, results: any[] }>;
  },
  ingestEvent: async (data: IngestRequest) => {
    const res = await fetch(`${API_BASE}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json() as Promise<IngestResponse>;
  },
  getConflicts: async () => {
    const res = await fetch(`${API_BASE}/conflicts`);
    return res.json() as Promise<{ conflicts: Conflict[] }>;
  },
  draftFollowup: async (entity_id: string, context: string) => {
    const res = await fetch(`${API_BASE}/draft-followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id, context })
    });
    return res.json() as Promise<{ draft: string }>;
  },
  getLiveEntropy: async () => {
    const res = await fetch(`${API_BASE}/entropy/live`);
    return res.json() as Promise<{ entities: EntropyEntry[] }>;
  },
};
