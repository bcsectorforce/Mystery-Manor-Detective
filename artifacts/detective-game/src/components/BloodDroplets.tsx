import React, { useEffect, useState, useRef } from "react";

interface Droplet {
  id: number;
  x: number;
  size: number;
  speed: number;
  delay: number;
  opacity: number;
}

interface BloodDropletsProps {
  trigger: number;
}

export function BloodDroplets({ trigger }: BloodDropletsProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [droplets] = useState<Droplet[]>(() =>
    Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      size: 6 + Math.random() * 8,
      speed: 1.4 + Math.random() * 0.8,
      delay: Math.random() * 0.4,
      opacity: 0.7 + Math.random() * 0.3,
    }))
  );
  const prevTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;

    setVisible(true);
    setFading(false);

    const fadeTimer = setTimeout(() => setFading(true), 1800);
    const hideTimer = setTimeout(() => { setVisible(false); setFading(false); }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [trigger]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: 48,
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.8s ease-out" : "none",
      }}
    >
      {droplets.map((d) => (
        <svg
          key={d.id}
          className="absolute top-0"
          style={{
            left: `${d.x}%`,
            width: d.size,
            height: "100%",
            overflow: "visible",
            animationName: "blood-drip-fall",
            animationDuration: `${d.speed}s`,
            animationDelay: `${d.delay}s`,
            animationTimingFunction: "ease-in",
            animationFillMode: "forwards",
            opacity: d.opacity,
          }}
          viewBox={`0 0 ${d.size} 100`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`dg-${d.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b0000" />
              <stop offset="100%" stopColor="#550000" />
            </linearGradient>
          </defs>
          <rect
            x={d.size * 0.15}
            y={0}
            width={d.size * 0.7}
            height={85}
            fill={`url(#dg-${d.id})`}
            rx={d.size * 0.35}
          />
          <ellipse
            cx={d.size / 2}
            cy={88}
            rx={d.size * 0.5}
            ry={d.size * 0.55}
            fill="#6b0000"
          />
        </svg>
      ))}

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 18,
          background: "radial-gradient(ellipse at center bottom, rgba(100,0,0,0.65) 0%, rgba(60,0,0,0.3) 55%, transparent 80%)",
          animationName: "puddle-grow",
          animationDuration: "0.6s",
          animationDelay: `${Math.max(...droplets.map((d) => d.delay + d.speed)) - 0.1}s`,
          animationTimingFunction: "ease-out",
          animationFillMode: "both",
        }}
      />

      <style>{`
        @keyframes blood-drip-fall {
          from { transform: translateY(-60px); }
          to   { transform: translateY(calc(100vh - 20px)); }
        }
        @keyframes puddle-grow {
          from { transform: scaleX(0.1); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
