import { useEffect, useRef, useState } from "react";
import { RecordOrb } from "../components/RecordOrb";
import {
  createNight,
  finalizeNight,
  isTauri,
  pickMime,
  processNight,
  writeAudioFile,
} from "../lib/api";
import { formatClock, formatDuration, greeting } from "../lib/time";
import type { Night } from "../lib/types";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeech(): SpeechRec | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";
  return rec;
}

export function NightView({
  onReady,
  onNight,
}: {
  onReady: (night: Night) => void;
  onNight: (night: Night) => void;
}) {
  const [clock, setClock] = useState(formatClock);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captions, setCaptions] = useState("");
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const speechRef = useRef<SpeechRec | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const finals = useRef<string[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      void toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, busy]);

  function stopSpeech() {
    try {
      speechRef.current?.stop();
    } catch {
      /* already stopped */
    }
    speechRef.current = null;
  }

  async function start() {
    setError(null);
    setCaptions("");
    setInterim("");
    finals.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    const ctx = new AudioContext();
    audioRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createAnalyser();
    node.fftSize = 2048;
    source.connect(node);
    setAnalyser(node);

    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size) chunksRef.current.push(ev.data);
    };
    recRef.current = recorder;
    recorder.start(400);
    startedAt.current = performance.now();
    setElapsed(0);
    timer.current = window.setInterval(() => {
      setElapsed((performance.now() - startedAt.current) / 1000);
    }, 200);
    setRecording(true);

    const speech = getSpeech();
    if (speech) {
      speech.onresult = (ev) => {
        let live = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const piece = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finals.current.push(piece.trim());
          else live += piece;
        }
        setCaptions(finals.current.join(" "));
        setInterim(live);
      };
      speech.onerror = () => undefined;
      try {
        speech.start();
        speechRef.current = speech;
      } catch {
        speechRef.current = null;
      }
    }
  }

  async function stop() {
    const recorder = recRef.current;
    setRecording(false);
    if (timer.current) window.clearInterval(timer.current);
    stopSpeech();
    const duration = (performance.now() - startedAt.current) / 1000;
    const live = [...finals.current, interim].filter(Boolean).join(" ").trim();

    const blob: Blob = await new Promise((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: pickMime() }));
        return;
      }
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || pickMime() }));
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    await audioRef.current?.close().catch(() => undefined);
    audioRef.current = null;
    setAnalyser(null);

    if (!isTauri()) {
      setError("Open NightMind as the desktop app to save a dump.");
      return;
    }
    if (blob.size < 800) {
      setError("That take was too short. Stay with it a little longer.");
      return;
    }

    try {
      setBusy("Keeping the night.");
      const night = await createNight(blob.type || pickMime());
      onNight(night);
      setBusy("Folding the recording into the dark.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await writeAudioFile(night.id, bytes);
      await finalizeNight(night.id, duration, live);
      setBusy("Listening back through the dark.");
      const done = await processNight(night.id);
      onNight(done);
      setBusy(null);
      if (done.status === "ready") onReady(done);
      else if (done.error) setError(done.error);
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggle() {
    if (busy) return;
    if (recording) await stop();
    else {
      try {
        await start();
      } catch {
        setError("The night needs a microphone.");
      }
    }
  }

  return (
    <section className="view night-view">
      <div className="kicker">NightMind</div>
      <div className="clock">{recording ? formatDuration(elapsed) : clock}</div>
      <p className="lede">
        {busy ?? (recording ? "Don't organize it. Just speak." : greeting())}
      </p>
      <RecordOrb recording={recording} analyser={analyser} onToggle={() => void toggle()} />
      {busy ? (
        <div className="stage">
          <div className="progress">
            <i />
          </div>
          <p>{busy}</p>
        </div>
      ) : (
        <p className="hint">
          {recording ? (
            <>
              tap the orb or press <kbd>space</kbd> to stop
            </>
          ) : (
            <>
              one long take · <kbd>space</kbd> to begin
            </>
          )}
        </p>
      )}
      <p className="captions">{[captions, interim].filter(Boolean).join(" ")}</p>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
