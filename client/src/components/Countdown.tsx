"use client";

import { useEffect, useState } from "react";

export default function Countdown({
  firedAt,
  durationSeconds,
}: {
  firedAt: string;
  durationSeconds: number;
}) {
  const [remaining, setRemaining] = useState(() => calcRemaining(firedAt, durationSeconds));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(firedAt, durationSeconds));
    }, 1000);
    return () => clearInterval(timer);
  }, [firedAt, durationSeconds]);

  if (remaining <= 0) return <span className="text-red-400 font-mono">Time&apos;s up!</span>;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className="font-mono text-xl tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

function calcRemaining(firedAt: string, durationSeconds: number) {
  const elapsed = (Date.now() - new Date(firedAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(durationSeconds - elapsed));
}
