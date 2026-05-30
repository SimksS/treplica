export type SessionStatus =
  | "draft"
  | "listening"
  | "paused"
  | "reconnecting"
  | "ended"
  | "failed"
  | "deleted";

export interface SessionDto {
  id: string;
  title: string;
  status: SessionStatus;
  target_language?: string | null;
}

export interface TranslationDto {
  id: string;
  transcript_segment_id: string;
  source_language: string;
  target_language: string;
  text: string;
  confidence: number;
  is_uncertain: boolean;
}

export interface TranscriptDto {
  id: string;
  speaker_label?: string | null;
  text: string;
  confidence: number;
  is_uncertain: boolean;
}

export interface SessionContextDto {
  session_id: string;
  role?: string | null;
  objective?: string | null;
  audience?: string | null;
  company_or_product_notes?: string | null;
  system_prompt?: string | null;
  assistant_preset_id?: string | null;
  preferred_tone?: string | null;
  forbidden_topics?: string | null;
  pre_meeting_context?: string | null;
  pre_meeting_context_source?: string | null;
  pre_meeting_attachment_page_count?: number | null;
}

export interface SuggestionDto {
  id: string;
  text: string;
  suggestion_type: string;
  confidence: number;
  rationale?: string | null;
  saved: boolean;
}

export interface LiveSessionStateDto {
  session: SessionDto | null;
  context?: SessionContextDto | null;
  transcripts: TranscriptDto[];
  translations: TranslationDto[];
  suggestions: SuggestionDto[];
  transcripts_total: number;
  translations_total: number;
  suggestions_total: number;
}

export interface TranscriptTickUpdateDto {
  new_transcript: TranscriptDto;
  new_translation?: TranslationDto | null;
  new_guidance?: GuidanceUpdateDto | null;
  guidance_error?: string | null;
  translation_error?: string | null;
  transcripts_total: number;
  translations_total: number;
  suggestions_total: number;
}

export interface GuidanceUpdateDto {
  new_suggestion: SuggestionDto;
  suggestions_total: number;
}

export type AiActivityPurpose =
  | "guidance"
  | "translation"
  | "transcription"
  | "vision";

export interface AiActivityEventDto {
  /** Emitted by Rust with camelCase serde. */
  sessionId: string;
  purpose: AiActivityPurpose;
}

export interface RuntimePlatformDto {
  os: string;
  display_name: string;
}

export interface OnboardingStateDto {
  completed: boolean;
  microphone_permission_granted: boolean;
  screen_permission_granted: boolean;
  transcription_language_mode: string;
  transcription_language_custom?: string | null;
  send_transcript_hotkey: string;
}

export interface SetupAiTestResultDto {
  response_text: string;
  latency_ms: number;
}

export interface CommandError {
  code: string;
  message: string;
}

export interface CommandResponse<T> {
  ok: boolean;
  data?: T;
  error?: CommandError;
}

export interface SessionHistoryItemDto {
  id: string;
  title: string;
  status: SessionStatus;
  transcript_count: number;
  suggestion_count: number;
  document_count: number;
  started_at?: string | null;
  ended_at?: string | null;
  assistant_preset_id?: string | null;
}

export type HistoryStatusFilter = "all" | "active" | "ended" | "failed";

/** `all` = todos; `unset` = sessões sem preset; demais = id de `ASSISTANT_PRESETS` */
export type HistoryAssistantFilter = "all" | "unset" | string;

export interface HistoryTranscriptDto {
  id: string;
  speaker_label?: string | null;
  text: string;
  is_uncertain: boolean;
  created_at: string;
}

export interface HistoryTranslationDto {
  id: string;
  transcript_segment_id: string;
  source_language: string;
  target_language: string;
  text: string;
  is_uncertain: boolean;
  created_at: string;
}

export interface HistorySuggestionDto {
  id: string;
  text: string;
  suggestion_type: string;
  confidence: number;
  rationale?: string | null;
  saved: boolean;
  created_at: string;
}

export interface SessionDetailDto {
  session: SessionHistoryItemDto;
  context?: SessionContextDto | null;
  transcripts: HistoryTranscriptDto[];
  translations: HistoryTranslationDto[];
  suggestions: HistorySuggestionDto[];
  provider_calls: {
    id: string;
    purpose: string;
    status: string;
    local_or_hosted: string;
  }[];
  documents: GeneratedDocumentDto[];
  audit_events: {
    id: string;
    category: string;
    action: string;
    severity: string;
    created_at: string;
  }[];
}

export interface GeneratedDocumentDto {
  id: string;
  session_id: string;
  doc_type: string;
  title: string;
  content: string;
  format: string;
  storage_path?: string | null;
  created_at: string;
}

export interface ExportDocumentResultDto {
  path: string;
  format: string;
  exported_at: string;
}

export interface ProviderConfigDto {
  id: string;
  provider_kind: string;
  display_name: string;
  base_url?: string | null;
  model?: string | null;
  enabled: boolean;
  local_only: boolean;
  has_credential: boolean;
  /** Set for Ollama after probing `GET /api/tags` on the configured base URL. */
  server_reachable?: boolean | null;
}

export interface PrivacySettingsDto {
  privacy_mode: string;
  hosted_warning_acknowledged: boolean;
  requires_hosted_warning: boolean;
}

export interface UpdateCheckDto {
  available: boolean;
  current_version: string;
  latest_version?: string | null;
  notes?: string | null;
  date?: string | null;
}

export interface DocumentsStorageSettingsDto {
  custom_export_dir?: string | null;
  default_export_dir: string;
  effective_export_dir: string;
}

export interface ImportDocumentsResultDto {
  imported: number;
  skipped: number;
  sessions_created: number;
  errors: string[];
}

export interface MicrophoneDeviceDto {
  id: string;
  label: string;
  isDefault: boolean;
}

export interface MicTestStatusDto {
  active: boolean;
  level: number;
  error: string | null;
}

export interface CaptureMonitorDto {
  id: number;
  name: string;
  width: number;
  height: number;
  isPrimary: boolean;
  x: number;
  y: number;
}

export interface OverlaySessionSnapshotDto {
  session_id?: string | null;
  status?: string | null;
  last_transcript?: TranscriptDto | null;
  last_translation?: TranslationDto | null;
  last_suggestion?: SuggestionDto | null;
  guidance_in_flight: boolean;
}

export interface SystemAudioBridgePayload {
  action: "start" | "stop";
  session_id: string;
  source_language?: string;
}

export interface MicrophoneBridgePayload {
  action: "start" | "stop";
  session_id: string;
  source_language?: string;
  muted?: boolean;
  with_system_audio?: boolean;
}

export interface MicOverlayStatusPayload {
  audio_level: number;
  capturing: boolean;
  error: string | null;
  interim?: string | null;
}

export interface SystemAudioOverlayStatusPayload {
  sharing: boolean;
  audio_level: number;
  status: string;
  error: string | null;
  chunks_sent: number;
  chunks_skipped: number;
}

export interface AccessibilitySettingsDto {
  font_scale: number;
  overlay_font_scale: number;
  reduce_motion: boolean;
  high_contrast: boolean;
}

export interface UpdateAccessibilityInput {
  font_scale: number;
  overlay_font_scale: number;
  reduce_motion: boolean;
  high_contrast: boolean;
}

export interface StealthStatusDto {
  overlay_visible: boolean;
  always_on_top: boolean;
  /** active | unsupported | failed | disabled */
  capture_exclusion: string;
  capture_exclusion_detail: string;
  platform: string;
  hotkey: string;
  capture_hidden_in_recording: boolean;
}
