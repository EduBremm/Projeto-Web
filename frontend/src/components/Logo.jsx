export default function Logo({ size = 32 }) {
  const s = size;
  const scale = s / 48;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 48 48"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="finann-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="11" fill="url(#finann-bg)" />
      <rect x="8" y="9" width="7" height="30" rx="3.5" fill="white" />
      <rect x="33" y="9" width="7" height="30" rx="3.5" fill="white" />
      <path
        d="M15,39 L21,39 L21,29 L27,29 L27,19 L33,19"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <circle cx="36" cy="9" r="4" fill="#93c5fd" />
    </svg>
  );
}
