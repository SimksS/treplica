/** Media constraints for cloud microphone capture. */
export function buildMicrophoneStreamConstraints(options?: {
  /**
   * When system/loopback audio is also captured, browser AEC often treats
   * speaker output as echo and silences the mic — disable processing.
   */
  withSystemAudio?: boolean;
}): MediaStreamConstraints {
  if (options?.withSystemAudio) {
    return {
      audio: {
        // AEC must stay off: browser would treat loopback audio as echo and
        // silence the mic. Noise suppression is independent of AEC and safe
        // to enable — it removes ambient noise (fans, AC) without AEC side-effects.
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };
  }
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
}
