"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface DualCameraProps {
  onCapture: (mergedFile: File, previewUrl: string) => void;
  onCancel: () => void;
}

type Phase = "back" | "switching" | "front" | "merging";

export default function DualCamera({ onCapture, onCancel }: DualCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("back");
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "environment" | "user") => {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError("Camera access denied. Please allow camera permissions.");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startCamera("environment");
    return () => stopStream();
  }, [startCamera, stopStream]);

  function captureFrame(): string | null {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  function triggerFlash() {
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  }

  async function handleBackCapture() {
    const frame = captureFrame();
    if (!frame) return;
    triggerFlash();
    setBackPhoto(frame);
    setPhase("switching");
    await startCamera("user");
    setPhase("front");
  }

  async function handleFrontCapture() {
    if (!backPhoto) return;
    triggerFlash();
    const frontFrame = captureFrame();
    if (!frontFrame) return;

    setPhase("merging");
    stopStream();

    const { file, url } = await mergePhotos(backPhoto, frontFrame);
    onCapture(file, url);
  }

  function handleRetakeBack() {
    setBackPhoto(null);
    setPhase("switching");
    startCamera("environment").then(() => setPhase("back"));
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button onClick={onCancel} className="text-white underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  if (phase === "merging") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Processing...</div>
      </div>
    );
  }

  const isFront = phase === "front";

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera feed */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            isFront ? "-scale-x-100" : ""
          } ${phase === "switching" ? "opacity-0" : "opacity-100"}`}
        />

        {/* Flash overlay */}
        {flash && <div className="absolute inset-0 bg-white z-30 pointer-events-none" />}

        {/* Back photo thumbnail while taking selfie */}
        {backPhoto && isFront && (
          <div className="absolute top-4 left-4 z-10 rounded-xl overflow-hidden border-2 border-white/40 shadow-lg">
            <img
              src={backPhoto}
              alt="Back photo"
              className="w-28 h-20 object-cover"
            />
          </div>
        )}

        {/* Phase label */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5">
            <span className="text-white text-sm font-medium">
              {phase === "back" && "Take your photo"}
              {phase === "switching" && "Switching..."}
              {phase === "front" && "Now take your selfie!"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-black px-6 py-5 flex items-center justify-between safe-bottom">
        <button
          onClick={onCancel}
          className="text-white/60 text-sm font-medium w-16 text-left"
        >
          Cancel
        </button>

        {/* Shutter button */}
        <button
          onClick={isFront ? handleFrontCapture : handleBackCapture}
          disabled={phase === "switching"}
          className="w-[76px] h-[76px] rounded-full border-[4px] border-white flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
        >
          <div className={`w-[64px] h-[64px] rounded-full transition-colors ${
            isFront ? "bg-white" : "bg-white"
          }`} />
        </button>

        {/* Retake (only on front phase) */}
        {isFront ? (
          <button
            onClick={handleRetakeBack}
            className="text-white/60 text-sm font-medium w-16 text-right"
          >
            Retake
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </div>
  );
}

// ── Image merging ─────────────────────────────────────────────

async function mergePhotos(
  back: string,
  front: string
): Promise<{ file: File; url: string }> {
  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const [backImg, frontImg] = await Promise.all([loadImg(back), loadImg(front)]);

  const canvas = document.createElement("canvas");
  canvas.width = backImg.width;
  canvas.height = backImg.height;
  const ctx = canvas.getContext("2d")!;

  // Main photo (back camera)
  ctx.drawImage(backImg, 0, 0);

  // Selfie overlay in top-left — ~28% width, rounded corners, black border
  const margin = Math.round(canvas.width * 0.04);
  const overlayW = Math.round(canvas.width * 0.28);
  const overlayH = Math.round(overlayW * (frontImg.height / frontImg.width));
  const radius = Math.round(overlayW * 0.1);
  const x = margin;
  const y = margin;
  const border = Math.max(3, Math.round(canvas.width * 0.004));

  // Black border behind selfie
  ctx.save();
  roundRect(ctx, x - border, y - border, overlayW + border * 2, overlayH + border * 2, radius + border);
  ctx.fillStyle = "#000";
  ctx.fill();

  // Draw selfie mirrored inside rounded rect
  roundRect(ctx, x, y, overlayW, overlayH, radius);
  ctx.clip();
  ctx.translate(x + overlayW, y);
  ctx.scale(-1, 1);
  ctx.drawImage(frontImg, 0, 0, overlayW, overlayH);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92)
  );
  const file = new File([blob], `candid-${Date.now()}.jpg`, { type: "image/jpeg" });
  const url = URL.createObjectURL(blob);
  return { file, url };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
