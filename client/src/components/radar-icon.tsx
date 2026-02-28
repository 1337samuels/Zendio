interface RadarIconProps {
  size?: number;
  className?: string;
}

export function RadarIcon({ size = 32, className = "" }: RadarIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="16" r="14" stroke="#00D4AA" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="16" cy="16" r="9" stroke="#00D4AA" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="16" cy="16" r="4" stroke="#00D4AA" strokeWidth="1.5" strokeOpacity="0.8" />
      <circle cx="16" cy="16" r="2" fill="#00D4AA" />
      <line x1="16" y1="16" x2="26" y2="7" stroke="#00D4AA" strokeWidth="1.5" strokeOpacity="0.9" strokeLinecap="round" />
      <circle cx="26" cy="7" r="1.5" fill="#00D4AA" fillOpacity="0.6" />
    </svg>
  );
}

export function RadarPulse({ size = 48 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full border border-teal/40 animate-[radar-pulse_1.5s_ease-out_infinite]"
        style={{ width: size * 0.6, height: size * 0.6 }}
      />
      <div
        className="absolute rounded-full border border-teal/30 animate-[radar-pulse_1.5s_ease-out_infinite_0.5s]"
        style={{ width: size * 0.6, height: size * 0.6 }}
      />
      <div className="relative z-10">
        <RadarIcon size={size * 0.5} />
      </div>
    </div>
  );
}
