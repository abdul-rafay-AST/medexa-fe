// Dynamically configured API Base URL

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
  private getApiUrl(): string {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // If we are running in the browser on Vercel or any non-localhost domain,
      // fallback to the Hugging Face Space backend URL.
      if (host !== "localhost" && host !== "127.0.0.1" && !host.startsWith("192.168.")) {
        return "https://abdul-rafay-ast-medexa-backend.hf.space";
      }
    }
    return process.env.NEXT_PUBLIC_MEDEXA_API_URL || "http://localhost:8000";
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    try {
      const apiBase = this.getApiUrl();
      const response = await fetch(`${apiBase}${endpoint}`, {
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

  async updateState(sessionId: string, status: RecordingStatus, elapsedSeconds?: number): Promise<ApiRecordingState | null> {
    return this.fetch<ApiRecordingState>(`/sessions/${sessionId}/state`, {
      method: "POST",
      body: JSON.stringify({ status, elapsedSeconds }),
    });
  }

  async applySuggestion(sessionId: string, suggestionId: string): Promise<ApiSuggestion | null> {
    return this.fetch<ApiSuggestion>(`/sessions/${sessionId}/suggestions/${suggestionId}/apply`, {
      method: "POST",
    });
  }

  async approveInsight(sessionId: string, insightId: string): Promise<ApiInsight | null> {
    return this.fetch<ApiInsight>(`/sessions/${sessionId}/insights/${insightId}/approve`, {
      method: "POST",
    });
  }

  async ignoreInsight(sessionId: string, insightId: string): Promise<ApiInsight | null> {
    return this.fetch<ApiInsight>(`/sessions/${sessionId}/insights/${insightId}/ignore`, {
      method: "POST",
    });
  }

  async generateSoapNotes(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/soap-notes/${sessionId}/generate`, { method: "POST" });
  }

  async generatePatientSummary(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/patient-summary/${sessionId}/generate`, { method: "POST" });
  }

  async finalizeSession(
    sessionId: string,
    transcript: string,
    totalSeconds: number,
    cptTimer: Record<string, unknown> = {},
    appliedSuggestions: string[] = [],
    detectedCptSuggestions: unknown[] = [],
    detectedIcd10Suggestions: unknown[] = [],
    ncciConflicts: unknown[] = []
  ): Promise<unknown | null> {
    return this.fetch(`/sessions/${sessionId}/finalize-session`, {
      method: "POST",
      body: JSON.stringify({
        transcript,
        total_seconds: totalSeconds,
        cpt_timer: cptTimer,
        applied_suggestions: appliedSuggestions,
        detected_cpt_suggestions: detectedCptSuggestions,
        detected_icd10_suggestions: detectedIcd10Suggestions,
        ncci_conflicts: ncciConflicts,
      }),
    });
  }

  async getSoapNotes(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/soap-notes/${sessionId}`);
  }

  async updateSoapNotes(sessionId: string, soap: unknown): Promise<unknown | null> {
    return this.fetch(`/soap-notes/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(soap),
    });
  }

  async getPatientSummary(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/patient-summary/${sessionId}`);
  }

  async updatePatientSummary(sessionId: string, summary: string): Promise<unknown | null> {
    return this.fetch(`/patient-summary/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify({ summary }),
    });
  }

  async sendPatientSummary(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/patient-summary/${sessionId}/send`, {
      method: "POST",
    });
  }

  async getBilling(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/billing/${sessionId}`);
  }

  async approveBillingCpt(sessionId: string, cptId: string): Promise<unknown | null> {
    return this.fetch(`/billing/${sessionId}/cpt/${cptId}/approve`, {
      method: "POST",
    });
  }

  async rejectBillingCpt(sessionId: string, cptId: string): Promise<unknown | null> {
    return this.fetch(`/billing/${sessionId}/cpt/${cptId}/reject`, {
      method: "POST",
    });
  }

  async getClaim(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/claims/${sessionId}`);
  }

  async submitClaim(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/claims/${sessionId}/submit`, {
      method: "POST",
    });
  }

  async saveClaimDraft(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/claims/${sessionId}/save-draft`, {
      method: "POST",
    });
  }

  async verifyClaim(sessionId: string): Promise<unknown | null> {
    return this.fetch(`/claims/${sessionId}/verify`, {
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
