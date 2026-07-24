"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Keyboard, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function QrScanner({
  onClose,
  onScan,
  title = "Scan QR",
  hint,
  keepOpen = true,
}: {
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  hint?: string;
  /** keep scanning after a hit (true) or close on first scan (false) */
  keepOpen?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    // Camera requires a secure context (HTTPS) or localhost.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErr(
        "Kamera hanya bisa di HTTPS (atau localhost). Buka aplikasi lewat https://, atau pakai input manual di bawah."
      );
      setShowManual(true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Browser ini tidak mengizinkan akses kamera di sini. Gunakan input manual di bawah.");
      setShowManual(true);
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code && code.data) {
            const now = Date.now();
            if (code.data !== lastRef.current.code || now - lastRef.current.at > 1500) {
              lastRef.current = { code: code.data, at: now };
              onScan(code.data);
              if (!keepOpen) {
                onClose();
                return;
              }
            }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        loop();
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (name === "NotAllowedError")
          setErr("Akses kamera ditolak. Izinkan kamera untuk situs ini, lalu buka ulang.");
        else if (name === "NotFoundError") setErr("Kamera tidak ditemukan di perangkat ini.");
        else setErr("Tidak bisa mengakses kamera. Coba input manual di bawah.");
        setShowManual(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onScan, onClose, keepOpen]);

  function submitManual() {
    const v = manual.trim();
    if (!v) return;
    onScan(v);
    setManual("");
    if (!keepOpen) onClose();
  }

  return (
    <>
      <button
        className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Tutup"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ScanLine className="h-4 w-4" /> {title}
            </span>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative bg-black">
            {err ? (
              <p className="px-6 py-8 text-center text-sm text-slate-300">{err}</p>
            ) : (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} className="h-72 w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-2xl border-2 border-white/70" />
                </div>
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="px-4 py-3">
            {hint ? <p className="mb-2 text-center text-xs text-slate-400">{hint}</p> : null}

            {!showManual ? (
              <button
                onClick={() => setShowManual(true)}
                className="mx-auto flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
              >
                <Keyboard className="h-3.5 w-3.5" /> Input manual
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitManual()}
                  placeholder="Ketik kode…"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
                <Button onClick={submitManual}>Gunakan</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
