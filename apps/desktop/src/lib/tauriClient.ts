import { invoke } from "@tauri-apps/api/core";
import type {
  AccessibilitySettingsDto,
  UpdateAccessibilityInput,
  CaptureMonitorDto,
  MicrophoneDeviceDto,
  CommandResponse,
  ExportDocumentResultDto,
  GeneratedDocumentDto,
  GuidanceUpdateDto,
  LiveSessionStateDto,
  OverlaySessionSnapshotDto,
  TranscriptTickUpdateDto,
  PrivacySettingsDto,
  DocumentsStorageSettingsDto,
  ImportDocumentsResultDto,
  ProviderConfigDto,
  SessionContextDto,
  SessionDetailDto,
  SessionDto,
  SessionHistoryItemDto,
  StealthStatusDto,
  OnboardingStateDto,
  RuntimePlatformDto,
  SetupAiTestResultDto,
  TranscriptDto,
} from "./types";

async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<CommandResponse<T>> {
  return invoke<CommandResponse<T>>(command, args ?? {});
}

export async function createSession(title?: string): Promise<CommandResponse<SessionDto>> {
  return invokeCommand("create_session", { title });
}

export async function startSession(sessionId: string): Promise<CommandResponse<SessionDto>> {
  return invokeCommand("start_session", { sessionId });
}

export async function pauseSession(sessionId: string): Promise<CommandResponse<SessionDto>> {
  return invokeCommand("pause_session", { sessionId });
}

export async function resumeSession(sessionId: string): Promise<CommandResponse<SessionDto>> {
  return invokeCommand("resume_session", { sessionId });
}

export async function endSession(sessionId: string): Promise<CommandResponse<SessionDto>> {
  return invokeCommand("end_session", { sessionId });
}

export async function appendTranscript(
  sessionId: string,
  text: string,
  speakerLabel?: string,
): Promise<CommandResponse<TranscriptDto>> {
  return invokeCommand("append_transcript", {
    sessionId,
    text,
    speakerLabel: speakerLabel ?? null,
  });
}

export async function simulateTranscriptTick(
  sessionId: string,
): Promise<CommandResponse<TranscriptTickUpdateDto>> {
  return invokeCommand("simulate_transcript_tick", { sessionId });
}

export async function requestGuidance(
  sessionId: string,
): Promise<CommandResponse<GuidanceUpdateDto>> {
  return invokeCommand("request_guidance", { sessionId });
}

export async function requestContextualGuidance(
  sessionId: string,
): Promise<CommandResponse<GuidanceUpdateDto>> {
  return invokeCommand("request_contextual_guidance", { sessionId });
}

export async function analyzeSessionImage(
  sessionId: string,
  imageDataUrl: string,
  source?: string | null,
): Promise<CommandResponse<GuidanceUpdateDto>> {
  return invokeCommand("analyze_session_image", {
    sessionId,
    imageDataUrl,
    source: source ?? null,
  });
}

export async function overlayAnalyzeImage(
  imageDataUrl?: string | null,
  source?: string | null,
): Promise<GuidanceUpdateDto> {
  return invoke<GuidanceUpdateDto>("overlay_analyze_image", {
    imageDataUrl: imageDataUrl ?? null,
    source: source ?? null,
  });
}

export async function ingestSystemAudioChunk(
  sessionId: string,
  audioBase64: string,
  mimeType?: string | null,
  sourceLanguage?: string | null,
  speakerLabel?: string | null,
  captureMode?: string | null,
): Promise<CommandResponse<TranscriptTickUpdateDto>> {
  return invokeCommand("ingest_system_audio_chunk", {
    sessionId,
    audioBase64,
    mimeType: mimeType ?? null,
    language: null,
    sourceLanguage: sourceLanguage ?? null,
    speakerLabel: speakerLabel ?? null,
    captureMode: captureMode ?? null,
  });
}

export async function ingestLiveTranscript(
  sessionId: string,
  text: string,
  speakerLabel?: string | null,
  language?: string | null,
): Promise<CommandResponse<TranscriptTickUpdateDto>> {
  return invokeCommand("ingest_live_transcript", {
    sessionId,
    text,
    speakerLabel: speakerLabel ?? null,
    language: language ?? null,
  });
}

export async function focusMainWindow(): Promise<void> {
  await invoke("focus_main_window");
}

export async function getOverlaySessionSnapshot(): Promise<OverlaySessionSnapshotDto> {
  return invoke<OverlaySessionSnapshotDto>("get_overlay_session_snapshot");
}

export async function overlayRequestGuidance(): Promise<GuidanceUpdateDto> {
  return invoke<GuidanceUpdateDto>("overlay_request_guidance");
}

export async function getLiveSessionState(
  sessionId: string,
): Promise<CommandResponse<LiveSessionStateDto>> {
  return invokeCommand("get_live_session_state", { sessionId });
}

export async function copySuggestion(
  sessionId: string,
  suggestionId: string,
): Promise<CommandResponse<void>> {
  return invokeCommand("copy_suggestion", { sessionId, suggestionId });
}

export async function setSessionTargetLanguage(
  sessionId: string,
  targetLanguage: string,
): Promise<CommandResponse<LiveSessionStateDto>> {
  return invokeCommand("set_session_target_language", {
    sessionId,
    targetLanguage,
  });
}

export async function translateTranscriptSegment(
  sessionId: string,
  transcriptSegmentId: string,
): Promise<CommandResponse<LiveSessionStateDto>> {
  return invokeCommand("translate_transcript_segment", {
    sessionId,
    transcriptSegmentId,
  });
}

export interface UpdateSessionContextInput {
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
  pre_meeting_attachment_pages_base64?: string[] | null;
}

export interface ParseMeetingDocumentInput {
  filename: string;
  text?: string | null;
  content_base64?: string | null;
}

export interface ParseMeetingDocumentResult {
  text: string;
  source_label: string;
  attachment_kind: string;
}

export async function parseMeetingDocument(
  input: ParseMeetingDocumentInput,
): Promise<CommandResponse<ParseMeetingDocumentResult>> {
  return invokeCommand("parse_meeting_document", { input });
}

export interface ModelTaskInfoDto {
  id: string;
  label: string;
  capability: string;
  assigned_provider_id?: string | null;
  assigned_model?: string | null;
}

export interface ModelRoutingDto {
  transcription_provider_id?: string | null;
  guidance_provider_id?: string | null;
  translation_provider_id?: string | null;
  vision_provider_id?: string | null;
  search_provider_id?: string | null;
  summarization_provider_id?: string | null;
  transcription_model?: string | null;
  guidance_model?: string | null;
  translation_model?: string | null;
  vision_model?: string | null;
  search_model?: string | null;
  summarization_model?: string | null;
}

export async function updateSessionContext(
  sessionId: string,
  input: UpdateSessionContextInput,
): Promise<CommandResponse<LiveSessionStateDto>> {
  return invokeCommand("update_session_context", { sessionId, input });
}

export async function getSessionContext(
  sessionId: string,
): Promise<CommandResponse<SessionContextDto>> {
  return invokeCommand("get_session_context", { sessionId });
}

export async function getAssistantPreferences(): Promise<
  CommandResponse<SessionContextDto>
> {
  return invokeCommand("get_assistant_preferences");
}

export async function saveAssistantPreferences(
  input: UpdateSessionContextInput,
): Promise<CommandResponse<SessionContextDto>> {
  return invokeCommand("save_assistant_preferences", { input });
}

export async function saveSuggestion(
  sessionId: string,
  suggestionId: string,
): Promise<CommandResponse<void>> {
  return invokeCommand("save_suggestion", { sessionId, suggestionId });
}

export async function listSessionHistory(
  query?: string,
  statusFilter?: string,
  assistantPresetFilter?: string,
): Promise<CommandResponse<SessionHistoryItemDto[]>> {
  return invokeCommand("list_session_history", {
    query: query ?? null,
    statusFilter: statusFilter && statusFilter !== "all" ? statusFilter : null,
    assistantPresetFilter:
      assistantPresetFilter && assistantPresetFilter !== "all"
        ? assistantPresetFilter
        : null,
    limit: 50,
  });
}

export async function renameSession(
  sessionId: string,
  title: string,
): Promise<CommandResponse<SessionHistoryItemDto>> {
  return invokeCommand("rename_session", { sessionId, title });
}

export async function getSessionDetail(
  sessionId: string,
): Promise<CommandResponse<SessionDetailDto>> {
  return invokeCommand("get_session_detail", { sessionId });
}

export async function generateSessionDocument(
  sessionId: string,
  docType: string,
): Promise<CommandResponse<GeneratedDocumentDto>> {
  return invokeCommand("generate_session_document", { sessionId, docType });
}

export async function exportSessionDocument(
  documentId: string,
): Promise<CommandResponse<ExportDocumentResultDto>> {
  return invokeCommand("export_session_document", { documentId });
}

export async function deleteGeneratedDocument(
  documentId: string,
): Promise<CommandResponse<void>> {
  return invokeCommand("delete_generated_document", { documentId });
}

export async function deleteSession(
  sessionId: string,
): Promise<CommandResponse<void>> {
  return invokeCommand("delete_session", { sessionId });
}

export async function listProviderConfigs(): Promise<
  CommandResponse<ProviderConfigDto[]>
> {
  return invokeCommand("list_provider_configs");
}

export interface TranscriptionAvailabilityDto {
  cloud_available: boolean;
  provider_id?: string | null;
  provider_display_name?: string | null;
  stt_model?: string | null;
  connection_model?: string | null;
  stt_model_is_fallback?: boolean;
}

export async function getTranscriptionAvailability(): Promise<
  CommandResponse<TranscriptionAvailabilityDto>
> {
  return invokeCommand("get_transcription_availability");
}

export interface CreateProviderInput {
  provider_kind: string;
  display_name: string;
  base_url?: string | null;
  model?: string | null;
  local_only: boolean;
  api_key?: string | null;
  allow_custom_endpoint?: boolean;
}

export async function createProviderConfig(
  input: CreateProviderInput,
): Promise<CommandResponse<ProviderConfigDto>> {
  return invokeCommand("create_provider_config", { input });
}

export async function updateProviderConfig(
  id: string,
  input: Partial<CreateProviderInput>,
): Promise<CommandResponse<ProviderConfigDto>> {
  return invokeCommand("update_provider_config", { providerId: id, input });
}

export async function enableProviderConfig(
  id: string,
): Promise<CommandResponse<ProviderConfigDto>> {
  return invokeCommand("enable_provider_config", { providerId: id });
}

export async function disableProviderConfig(
  id: string,
): Promise<CommandResponse<ProviderConfigDto>> {
  return invokeCommand("disable_provider_config", { providerId: id });
}

export async function deleteProviderConfig(
  id: string,
): Promise<CommandResponse<void>> {
  return invokeCommand("delete_provider_config", { providerId: id });
}

export async function testProviderConfig(
  id: string,
): Promise<CommandResponse<string>> {
  return invokeCommand("test_provider_config", { providerId: id });
}

export async function getPrivacySettings(): Promise<
  CommandResponse<PrivacySettingsDto>
> {
  return invokeCommand("get_privacy_settings");
}

export async function updatePrivacySettings(
  privacyMode: string,
): Promise<CommandResponse<PrivacySettingsDto>> {
  return invokeCommand("update_privacy_settings", {
    input: { privacy_mode: privacyMode },
  });
}

export async function acknowledgeHostedProviderWarning(): Promise<
  CommandResponse<PrivacySettingsDto>
> {
  return invokeCommand("acknowledge_hosted_provider_warning");
}

export async function acknowledgeSessionHostedData(
  sessionId: string,
): Promise<CommandResponse<boolean>> {
  return invokeCommand("acknowledge_session_hosted_data", { sessionId });
}

export async function checkForAppUpdate(): Promise<
  CommandResponse<import("./types").UpdateCheckDto>
> {
  return invokeCommand("check_for_app_update");
}

export async function installAppUpdate(): Promise<CommandResponse<string>> {
  return invokeCommand("install_app_update");
}

export async function getDocumentsStorageSettings(): Promise<
  CommandResponse<DocumentsStorageSettingsDto>
> {
  return invokeCommand("get_documents_storage_settings");
}

export async function setDocumentsExportDirectory(input: {
  path?: string | null;
}): Promise<CommandResponse<DocumentsStorageSettingsDto>> {
  return invokeCommand("set_documents_export_directory", { input });
}

export async function pickDocumentsExportDirectory(): Promise<
  CommandResponse<string | null>
> {
  return invokeCommand("pick_documents_export_directory");
}

export async function pickDocumentsImportDirectory(): Promise<
  CommandResponse<string | null>
> {
  return invokeCommand("pick_documents_import_directory");
}

export async function openDocumentsExportDirectory(): Promise<
  CommandResponse<void>
> {
  return invokeCommand("open_documents_export_directory");
}

export async function importSessionDocuments(input: {
  directory?: string | null;
}): Promise<CommandResponse<ImportDocumentsResultDto>> {
  return invokeCommand("import_session_documents", { input });
}

export async function wipeAllData(keepProviders: boolean): Promise<CommandResponse<null>> {
  return invokeCommand("wipe_all_data", { keepProviders });
}

export async function getAccessibilitySettings(): Promise<
  CommandResponse<AccessibilitySettingsDto>
> {
  return invokeCommand("get_accessibility_settings");
}

export async function updateAccessibilitySettings(
  input: UpdateAccessibilityInput,
): Promise<CommandResponse<AccessibilitySettingsDto>> {
  return invokeCommand("update_accessibility_settings", { input });
}

export async function getStealthStatus(): Promise<
  CommandResponse<StealthStatusDto>
> {
  return invokeCommand("get_stealth_status");
}

export async function toggleStealthOverlay(): Promise<
  CommandResponse<StealthStatusDto>
> {
  return invokeCommand("toggle_stealth_overlay");
}

export async function showStealthOverlay(): Promise<
  CommandResponse<StealthStatusDto>
> {
  return invokeCommand("show_stealth_overlay");
}

export async function hideStealthOverlay(): Promise<
  CommandResponse<StealthStatusDto>
> {
  return invokeCommand("hide_stealth_overlay");
}

export interface ActiveSessionSummaryDto {
  session_id: string;
  title: string;
  status: string;
}

export async function getActiveSessionSummary(): Promise<
  CommandResponse<ActiveSessionSummaryDto | null>
> {
  return invokeCommand("get_active_session_summary");
}

export async function listCaptureMonitors(): Promise<CaptureMonitorDto[]> {
  return invoke<CaptureMonitorDto[]>("list_capture_monitors");
}

export async function getSnapshotMonitor(
  sessionId?: string | null,
): Promise<number | null> {
  const id = await invoke<number | null>("get_snapshot_monitor", {
    sessionId: sessionId ?? null,
  });
  return id ?? null;
}

export async function setSnapshotMonitor(
  monitorId: number,
  sessionId?: string | null,
): Promise<void> {
  await invoke("set_snapshot_monitor", {
    monitorId,
    sessionId: sessionId ?? null,
  });
}

export async function captureScreenSnapshot(options?: {
  monitorId?: number;
  sessionId?: string | null;
}): Promise<string> {
  return invoke<string>("capture_screen_snapshot", {
    monitorId: options?.monitorId ?? null,
    sessionId: options?.sessionId ?? null,
  });
}

export async function toggleOverlayCaptureExclusion(): Promise<StealthStatusDto> {
  return invoke<StealthStatusDto>("toggle_overlay_capture_exclusion");
}

/** Pauses overlay capture-exclusion while sharing system audio (avoids black overlay on Windows). */
export async function setOverlaySystemAudioCaptureActive(
  active: boolean,
): Promise<StealthStatusDto> {
  return invoke<StealthStatusDto>("set_overlay_system_audio_capture_active", {
    active,
  });
}

export async function systemAudioBridge(params: {
  action: "start" | "stop";
  sessionId: string;
  sourceLanguage?: string;
}): Promise<CommandResponse<void>> {
  return invokeCommand("system_audio_bridge", {
    action: params.action,
    sessionId: params.sessionId,
    sourceLanguage: params.sourceLanguage ?? null,
  });
}

export async function microphoneBridge(params: {
  action: "start" | "stop";
  sessionId: string;
  sourceLanguage?: string;
  muted?: boolean;
  withSystemAudio?: boolean;
}): Promise<CommandResponse<void>> {
  return invokeCommand("microphone_bridge", {
    action: params.action,
    sessionId: params.sessionId,
    sourceLanguage: params.sourceLanguage ?? null,
    muted: params.muted ?? null,
    withSystemAudio: params.withSystemAudio ?? null,
  });
}

export async function claimAudioCapture(
  mode: "microphone" | "system",
  owner: "main" | "stealth",
): Promise<CommandResponse<void>> {
  return invokeCommand("claim_audio_capture", { mode, owner });
}

export async function releaseAudioCapture(
  mode: "microphone" | "system",
  owner: "main" | "stealth",
): Promise<CommandResponse<void>> {
  return invokeCommand("release_audio_capture", { mode, owner });
}

export async function releaseAllAudioCapture(
  owner: "main" | "stealth",
): Promise<void> {
  await releaseAudioCapture("microphone", owner);
  await releaseAudioCapture("system", owner);
  await stopNativeSystemAudio(owner);
  await stopNativeMicrophone(owner);
}

export async function nativeSystemAudioSupported(): Promise<boolean> {
  return invoke<boolean>("native_system_audio_supported");
}

export interface NativeSystemAudioStatusDto {
  active: boolean;
  audio_level: number;
  chunks_sent: number;
  chunks_skipped: number;
  status: string;
  error?: string | null;
}

export async function startNativeSystemAudio(params: {
  sessionId: string;
  sourceLanguage?: string;
  owner: "main" | "stealth";
}): Promise<CommandResponse<NativeSystemAudioStatusDto>> {
  return invokeCommand("start_native_system_audio", {
    sessionId: params.sessionId,
    sourceLanguage: params.sourceLanguage ?? null,
    owner: params.owner,
  });
}

export async function stopNativeSystemAudio(
  owner: "main" | "stealth",
): Promise<CommandResponse<NativeSystemAudioStatusDto>> {
  return invokeCommand("stop_native_system_audio", { owner });
}

export async function getNativeSystemAudioStatus(): Promise<NativeSystemAudioStatusDto> {
  return invoke<NativeSystemAudioStatusDto>("get_native_system_audio_status");
}

export async function nativeMicrophoneSupported(): Promise<boolean> {
  return invoke<boolean>("native_microphone_supported");
}

export async function listMicrophones(): Promise<MicrophoneDeviceDto[]> {
  return invoke<MicrophoneDeviceDto[]>("list_microphones");
}

export async function getPreferredMicrophone(): Promise<
  CommandResponse<string | null>
> {
  return invokeCommand("get_preferred_microphone");
}

export async function setPreferredMicrophone(
  deviceName: string | null,
): Promise<CommandResponse<string | null>> {
  return invokeCommand("set_preferred_microphone", {
    deviceName: deviceName ?? null,
  });
}

export async function startMicrophoneTest(
  deviceName: string | null,
): Promise<CommandResponse<null>> {
  return invokeCommand("start_microphone_test", {
    deviceName: deviceName ?? null,
  });
}

export async function stopMicrophoneTest(): Promise<void> {
  return invoke<void>("stop_microphone_test");
}

export async function startNativeMicrophone(params: {
  sessionId: string;
  sourceLanguage?: string;
  owner: "main" | "stealth";
  muted?: boolean;
}): Promise<CommandResponse<NativeSystemAudioStatusDto>> {
  return invokeCommand("start_native_microphone", {
    sessionId: params.sessionId,
    sourceLanguage: params.sourceLanguage ?? null,
    owner: params.owner,
    muted: params.muted ?? false,
  });
}

export async function stopNativeMicrophone(
  owner: "main" | "stealth",
  sessionId?: string | null,
): Promise<CommandResponse<NativeSystemAudioStatusDto>> {
  return invokeCommand("stop_native_microphone", {
    owner,
    sessionId: sessionId ?? null,
  });
}

export async function getNativeMicrophoneStatus(): Promise<NativeSystemAudioStatusDto> {
  return invoke<NativeSystemAudioStatusDto>("get_native_microphone_status");
}

export async function setNativeMicrophoneMuted(muted: boolean): Promise<void> {
  return invoke<void>("set_native_microphone_muted", { muted });
}

export async function setStealthAlwaysOnTop(
  enabled: boolean,
): Promise<CommandResponse<StealthStatusDto>> {
  return invokeCommand("set_stealth_always_on_top", { enabled });
}

export async function listModelTasks(): Promise<
  CommandResponse<ModelTaskInfoDto[]>
> {
  return invokeCommand("list_model_tasks");
}

export async function getModelRouting(): Promise<
  CommandResponse<ModelRoutingDto>
> {
  return invokeCommand("get_model_routing");
}

export async function updateModelRouting(
  routing: ModelRoutingDto,
): Promise<CommandResponse<ModelRoutingDto>> {
  return invokeCommand("update_model_routing", { routing });
}

export async function testModelTask(
  taskId: string,
): Promise<CommandResponse<string>> {
  return invokeCommand("test_model_task", { taskId });
}

export interface UpdateOnboardingInput {
  microphone_permission_granted?: boolean;
  screen_permission_granted?: boolean;
  transcription_language_mode?: string;
  transcription_language_custom?: string;
}

export async function getRuntimePlatform(): Promise<
  CommandResponse<RuntimePlatformDto>
> {
  return invokeCommand("get_runtime_platform");
}

export async function getOnboardingState(): Promise<
  CommandResponse<OnboardingStateDto>
> {
  return invokeCommand("get_onboarding_state");
}

export async function updateOnboardingState(
  input: UpdateOnboardingInput,
): Promise<CommandResponse<OnboardingStateDto>> {
  return invokeCommand("update_onboarding_state", { input });
}

export async function completeOnboarding(): Promise<
  CommandResponse<OnboardingStateDto>
> {
  return invokeCommand("complete_onboarding");
}

export async function runSetupAiTest(
  transcript: string,
  languageHint?: string | null,
): Promise<CommandResponse<SetupAiTestResultDto>> {
  return invokeCommand("run_setup_ai_test", {
    transcript,
    languageHint: languageHint ?? null,
  });
}

export function unwrap<T>(response: CommandResponse<T>): T {
  if (!response.ok || response.data === undefined) {
    throw new Error(response.error?.message ?? "Unknown command error");
  }
  return response.data;
}
