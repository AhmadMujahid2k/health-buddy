export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="hb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#hb-g)" />
      <path
        d="M32 50 C14 38 10 29 10 22.5 C10 16 15 11.5 21 11.5 C25.5 11.5 29.5 14 32 18 C34.5 14 38.5 11.5 43 11.5 C49 11.5 54 16 54 22.5 C54 29 50 38 32 50 Z"
        fill="#fff"
      />
      <path
        d="M15 30 H24 L27.5 23 L32 37 L36 27 L38.5 30 H49"
        fill="none" stroke="#0f766e" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-extrabold tracking-tight text-white">
        Health<span className="text-brand-300">Buddy</span>
      </span>
    </span>
  );
}
