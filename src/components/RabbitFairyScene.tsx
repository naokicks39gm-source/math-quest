"use client";

import { useEffect, useRef } from "react";

type RabbitFairySceneProps = {
  combo: number;
};

export default function RabbitFairyScene({ combo }: RabbitFairySceneProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (combo >= 3 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [combo]);

  return (
    <div className="w-full rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 via-pink-50 to-amber-50 p-4 shadow-sm">
      <div className="relative h-48 w-full overflow-hidden rounded-xl bg-white/60">
        <svg viewBox="0 0 400 220" className="h-full w-full">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="60%" stopColor="#fde2e4" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>
            <radialGradient id="spark" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="rgba(253,230,138,0)" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="400" height="220" fill="url(#sky)" />
          <rect x="0" y="160" width="400" height="60" fill="#f0fdf4" opacity="0.9" />

          {/* Magical particles */}
          {[
            [40, 40],
            [90, 20],
            [140, 60],
            [220, 30],
            [300, 50],
            [360, 25]
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill="url(#spark)" />
          ))}

          {/* Rabbit fairy (center) */}
          <g transform="translate(190,40)">
            {/* Wings */}
            <ellipse cx="-15" cy="55" rx="28" ry="20" fill="#c7d2fe" opacity="0.6" />
            <ellipse cx="45" cy="55" rx="28" ry="20" fill="#c7d2fe" opacity="0.6" />

            {/* Body */}
            <ellipse cx="15" cy="90" rx="24" ry="30" fill="#fff7ed" />
            <path
              d="M-2 85 Q15 70 32 85 Q22 105 8 115 Q-5 105 -2 85 Z"
              fill="#fde2e4"
              opacity="0.8"
            />

            {/* Head */}
            <circle cx="15" cy="40" r="20" fill="#ffffff" />
            <circle cx="7" cy="38" r="3" fill="#1f2937" />
            <circle cx="23" cy="38" r="3" fill="#1f2937" />
            <circle cx="6.5" cy="36.5" r="1" fill="#93c5fd" />
            <circle cx="22.5" cy="36.5" r="1" fill="#93c5fd" />
            <path d="M12 44 Q15 47 18 44" stroke="#fb7185" strokeWidth="2" fill="none" />

            {/* Ears */}
            <ellipse cx="2" cy="10" rx="6" ry="16" fill="#ffffff" />
            <ellipse cx="28" cy="10" rx="6" ry="16" fill="#ffffff" />
            <ellipse cx="2" cy="12" rx="3" ry="10" fill="#fecdd3" />
            <ellipse cx="28" cy="12" rx="3" ry="10" fill="#fecdd3" />

            {/* Wand */}
            <rect x="45" y="75" width="26" height="3" rx="2" fill="#f59e0b" />
            <circle cx="74" cy="76.5" r="5" fill="#fde68a" />
            <circle cx="74" cy="76.5" r="10" fill="url(#spark)" />
          </g>
        </svg>
        <img
          src="/hero.png"
          alt="Hero"
          className={`absolute bottom-0 left-4 h-40 w-auto drop-shadow-md transition-opacity ${
            combo >= 3 ? "opacity-0" : "opacity-100"
          }`}
        />
        <video
          ref={videoRef}
          src="/hero.mp4"
          muted
          playsInline
          className={`absolute bottom-0 left-4 h-40 w-auto drop-shadow-md transition-opacity ${
            combo >= 3 ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500 text-center">
        魔法でサポートするうさぎ妖精
      </div>
    </div>
  );
}
