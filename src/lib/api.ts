const API_BASE = process.env.NEXT_PUBLIC_MEDEXA_API_URL || "http://localhost:8000";

export type RecordingStatus = "idle" | "recording" | "paused" | "stopped";

export interface ApiSession {
  id: string;
  patientName: string;
  avatar: string;
  ageSex: string;
  weight: string;
  mrnNumber: string;
  payorSource: string;
  careType: string;
  cpt: string;
  icd: string;
  sessionTime: string;
  status: string;
  dateTime: string;
}

export interface ApiRecordingState {
  status: RecordingStatus;
  elapsedSeconds: number;
  units: number;
  nextUnitAt: number;
  timeLeft: number;
}

export interface StartSessionRequest {
  patientName?: string;
  patientId?: string;
  therapistId?: string;
  avatar?: string;
  ageSex?: string;
  weight?: string;
  mrnNumber?: string;
  payorSource?: string;
  careType?: string;
  cpt?: string;
  icd?: string;
}

export interface ApiInsight {
  id: string;
  type: "protocol" | "detected" | "billing";
  label: string;
  question: string;
  description: string;
  status: "pending" | "approved" | "ignored";
}

export interface ApiSuggestion {
  id: string;
  title: string;
  text: string;
  applied: boolean;
}

export interface StartSessionResponse {
  session: ApiSession;
  state: ApiRecordingState;
}

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        console.error(`API ${response.status} at ${endpoint}:`, detail);
        return null;
      }

      return await response.json();
    } catch (e) {
      console.error(`Fetch failed for ${endpoint}:`, e);
      return null;
    }
  }

  async startSession(data: StartSessionRequest): Promise<StartSessionResponse | null> {
    return this.fetch<StartSessionResponse>("/sessions/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSession(sessionId: string): Promise<ApiSession | null> {
    return this.fetch<ApiSession>(`/sessions/${sessionId}`);
  }

  async getState(sessionId: string): Promise<ApiRecordingState | null> {
    return this.fetch<ApiRecordingState>(`/sessions/${sessionId}/state`);
  }

  async analyzeTranscriptChunk(sessionId: string, chunkText: string): Promise<unknown | null> {
    return this.fetch(`/sessions/${sessionId}/analyze-transcript-chunk`, {
      method: "POST",
      body: JSON.stringify({ chunk_text: chunkText }),
    });
  }

  async getInsights(sessionId: string): Promise<ApiInsight[] | null> {
    return this.fetch<ApiInsight[]>(`/sessions/${sessionId}/insights`);
  }

  async getSuggestions(sessionId: string): Promise<ApiSuggestion[] | null> {
    return this.fetch<ApiSuggestion[]>(`/sessions/${sessionId}/suggestions`);
  }

  async updateState(sessionId: string, status: RecordingStatus): Promise<ApiRecordingState | null> {
    return this.fetch<ApiRecordingState>(`/sessions/${sessionId}/state`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  }

  async applySuggestion(sessionId: string, suggestionId: string): Promise<ApiSuggestion | null> {
    return this.fetch<ApiSuggestion>(`/sessions/${sessionId}/suggestions/${suggestionId}/apply`, {
      method: "POST",
    });
  }
}

export const api = new ApiClient();

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
