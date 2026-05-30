import { useCallback, useEffect, useRef, useState } from "react";

export async function requestMicrophonePermission(): Promise<{
  granted: boolean;
  error?: string;
}> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      granted: false,
      error: "Microfone não suportado neste ambiente",
    };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (e) {
    return {
      granted: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Returns 0–1 audio level for waveform visualization. */
export function useMicrophoneLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }

    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new AudioContext();
        if (ctx.state !== "running") {
          await ctx.resume();
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(1, avg / 128));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLevel(0);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [active]);

  return level;
}

export function useMicrophonePermission() {
  const [status, setStatus] = useState<"unknown" | "granted" | "denied">(
    "unknown",
  );
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async () => {
    const result = await requestMicrophonePermission();
    if (result.granted) {
      setStatus("granted");
      setError(null);
    } else {
      setStatus("denied");
      setError(result.error ?? "Permissão negada");
    }
    return result.granted;
  }, []);

  return { status, error, request };
}
