/** STT failures that should disable cloud transcription and fall back to Web Speech. */
export function isRecoverableCloudSttFailure(
  code?: string | null,
  message = "",
): boolean {
  if (
    code === "transcription_payment_required" ||
    code === "transcription_auth_failed"
  ) {
    return true;
  }
  if (code === "transcription_rate_limited") {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("402") ||
    lower.includes("payment required") ||
    (lower.includes("balance") && lower.includes("audio")) ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("429")
  );
}
