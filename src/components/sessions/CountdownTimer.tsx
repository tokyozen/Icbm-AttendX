"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  expiresAt: string;
  onExpired?: () => void;
}

export default function CountdownTimer({ expiresAt, onExpired }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        onExpiredRef.current?.();
        return;
      }
      setRemaining(diff);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return <span style={{ color: "#64748b" }}>--:--</span>;

  if (remaining <= 0) {
    return <span style={{ color: "#ef4444", fontWeight: 700 }}>Expired</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const color =
    minutes < 5
      ? "#ef4444"   // red — critical
      : minutes < 10
      ? "#C9922A"   // gold — warning
      : "#16a34a";  // green — safe

  return (
    <span
      style={{
        color,
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        fontSize: "inherit",
      }}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
