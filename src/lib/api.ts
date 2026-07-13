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
  billingElapsedSeconds: number;
  cptElapsedSeconds: number;
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

export interface ApiAssistantSuggestion {
  id: string;
  triggerId: string;
  kind:
    | "documentation_reminder"
    | "missing_information"
    | "clinical_question"
    | "general";
  title: string;
  body: string;
  confidence: "low" | "medium" | "high";
  status: "active" | "dismissed";
  disclaimer: string;
  createdAt: string;
}

export interface ApiPathBTriggerStatus {
  id: string;
  reason: string;
  status: "pending" | "dispatched" | "completed" | "skipped";
  createdAt: string;
}

export interface ApiDiarizedUtterance {
  id: string;
  speaker: "therapist" | "patient";
  text: string;
  atSeconds: number;
  endSeconds?: number;
  confidence: number;
  diarizationMethod?: "voice" | "text" | "hybrid" | "deepgram";
}

export interface ApiAudioSegment {
  start: number;
  end: number;
  text: string;
  speaker: "therapist" | "patient";
}

export interface ApiTranscribeAudioResult {
  transcript: string;
  speaker: "therapist" | "patient";
  speakerConfidence: number;
  diarizationMethod?: "voice" | "text" | "hybrid" | "deepgram";
  transcriptionProvider?: "deepgram" | "groq_whisper" | "aws_transcribe";
  atSeconds: number;
  endSeconds?: number;
  audioSegments?: ApiAudioSegment[];
}

export interface ApiExtractedEntity {
  id: string;
  phrase: string;
  region?: string;
  displayRegion?: string;
  cpt?: string;
  icd10?: string;
  isBillable: boolean;
}

export interface ApiLivePipelineSnapshot {
  sessionId: string;
  billingRegion: string;
  elapsedSeconds: number;
  pathA: {
    status: string;
    entityCount: number;
    alertCount: number;
    suggestionCount: number;
    activeCpt: string | null;
    cptDisplayName: string | null;
    sessionTimerSec: number;
    cptElapsedSeconds: number;
    units: number;
  };
  pathB: {
    enabled: boolean;
    status: string;
    triggerCount: number;
    suggestionCount: number;
    triggers: ApiPathBTriggerStatus[];
  };
  pathC: {
    status: string;
    hasSoap: boolean;
    hasSummary: boolean;
    reviewOpenCount: number;
  };
  insights: ApiInsight[];
  billingSuggestions: ApiSuggestion[];
  assistantSuggestions: ApiAssistantSuggestion[];
  entities: ApiExtractedEntity[];
  diarizedUtterances: ApiDiarizedUtterance[];
  transcriptPreview: string;
}

export interface AnalyzeChunkOptions {
  elapsedSeconds?: number;
  durationSeconds?: number;
  startTime?: string;
  endTime?: string;
}

export interface StartSessionResponse {
  session: ApiSession;
  state: ApiRecordingState;
}

class ApiClient {
  private getApiUrl(): string {
    if (process.env.NEXT_PUBLIC_MEDEXA_API_URL) {
      return process.env.NEXT_PUBLIC_MEDEXA_API_URL;
    }
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // If we are running in the browser on Vercel or any non-localhost domain,
      // fallback to the Hugging Face Space backend URL.
      if (host !== "localhost" && host !== "127.0.0.1" && !host.startsWith("192.168.")) {
        return "https://abdul-rafay-ast-medexa-backend.hf.space";
      }
      if (host.startsWith("192.168.")) {
        return `http://${host}:8000`;
      }
    }
    return "http://localhost:8000";
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

  async analyzeTranscriptChunk(
    sessionId: string,
    chunkText: string,
    options: AnalyzeChunkOptions = {}
  ): Promise<unknown | null> {
    return this.fetch(`/sessions/${sessionId}/analyze-transcript-chunk`, {
      method: "POST",
      body: JSON.stringify({
        chunk_text: chunkText,
        elapsed_seconds: options.elapsedSeconds,
        duration_seconds: options.durationSeconds ?? 15,
        start_time: options.startTime ?? "",
        end_time: options.endTime ?? "",
      }),
    });
  }

  async getInsights(sessionId: string): Promise<ApiInsight[] | null> {
    return this.fetch<ApiInsight[]>(`/sessions/${sessionId}/insights`);
  }

  async getSuggestions(sessionId: string): Promise<ApiSuggestion[] | null> {
    return this.fetch<ApiSuggestion[]>(`/sessions/${sessionId}/suggestions`);
  }

  async getAssistantSuggestions(sessionId: string): Promise<ApiAssistantSuggestion[] | null> {
    return this.fetch<ApiAssistantSuggestion[]>(`/sessions/${sessionId}/assistant-suggestions`);
  }

  async getLivePipeline(sessionId: string): Promise<ApiLivePipelineSnapshot | null> {
    return this.fetch<ApiLivePipelineSnapshot>(`/sessions/${sessionId}/live-pipeline`);
  }

  async transcribeAudio(
    sessionId: string,
    blob: Blob,
    mimeType?: string,
    clientPitchHz?: number,
    clientDurationSeconds?: number,
    clientElapsedSeconds?: number
  ): Promise<ApiTranscribeAudioResult | null> {
    try {
      const apiBase = this.getApiUrl();
      const form = new FormData();
      const type = (mimeType || blob.type || "audio/webm").split(";")[0].trim().toLowerCase();
      const ext =
        type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : type.includes("wav") ? "wav" : "webm";
      const file = new File([blob], `chunk.${ext}`, { type: type || "audio/webm" });
      form.append("file", file);
      if (clientPitchHz && clientPitchHz > 0) {
        form.append("client_pitch_hz", String(Math.round(clientPitchHz)));
      }
      if (clientDurationSeconds && clientDurationSeconds > 0) {
        form.append("client_duration_seconds", String(clientDurationSeconds));
      }
      if (clientElapsedSeconds !== undefined && clientElapsedSeconds >= 0) {
        form.append("client_elapsed_seconds", String(Math.floor(clientElapsedSeconds)));
      }
      const response = await fetch(`${apiBase}/sessions/${sessionId}/transcribe-audio`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        let detail = await response.text().catch(() => response.statusText);
        try {
          const parsed = JSON.parse(detail) as { detail?: string };
          if (parsed.detail) detail = parsed.detail;
        } catch {
          /* keep raw text */
        }
        throw new Error(detail || `Transcription failed (${response.status})`);
      }
      const data = (await response.json()) as {
        transcript: string;
        speaker?: "therapist" | "patient";
        speakerConfidence?: number;
        diarizationMethod?: "voice" | "text" | "hybrid" | "deepgram";
        transcriptionProvider?: "deepgram" | "groq_whisper" | "aws_transcribe";
        atSeconds?: number;
        endSeconds?: number;
        audioSegments?: ApiAudioSegment[];
      };
      return {
        transcript: data.transcript,
        speaker: data.speaker ?? "patient",
        speakerConfidence: data.speakerConfidence ?? 0.5,
        diarizationMethod: data.diarizationMethod,
        transcriptionProvider: data.transcriptionProvider,
        atSeconds: data.atSeconds ?? 0,
        endSeconds: data.endSeconds,
        audioSegments: data.audioSegments,
      };
    } catch (e) {
      console.error("transcribeAudio failed:", e);
      throw e instanceof Error ? e : new Error("Transcription failed");
    }
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
