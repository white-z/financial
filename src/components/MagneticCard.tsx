"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

interface MagneticCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  intensity?: number;
}

/**
 * 磁性 3D 悬浮卡片：鼠标位置驱动 perspective rotateX/Y，产生轻微向光源倾斜的立体感。
 * 离开时平滑复位。仅用于小型入口卡片（如微观工具入口）。
 */
export function MagneticCard({ children, className = "", style, intensity = 8 }: MagneticCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, z: 0 });
  const [shadow, setShadow] = useState("var(--shadow-card)");

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 ~ 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rotX: -y * intensity, rotY: x * intensity, z: 6 });
    setShadow(`0 ${18 + y * 8}px ${40 + Math.abs(x) * 24}px rgba(0,0,0,0.55)`);
  }

  function onMouseLeave() {
    setTilt({ rotX: 0, rotY: 0, z: 0 });
    setShadow("var(--shadow-card)");
  }

  const transform = `perspective(900px) rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) translateZ(${tilt.z}px)`;

  return (
    <div
      ref={ref}
      className={`card-magnetic ${className}`}
      style={{ ...style, transform, boxShadow: shadow }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}
