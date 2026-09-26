// Original flat-style illustration (no external assets) - friends
// planning a trip around a map, set in the app's warm palette.
export default function TripIllustration() {
  return (
    <svg
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-sm"
      role="img"
      aria-label="Friends planning a trip around a map"
    >
      <ellipse cx="200" cy="205" rx="150" ry="10" fill="#FDE4D0" />

      {/* sun */}
      <circle cx="335" cy="45" r="26" fill="#FBBF77" />
      <circle cx="335" cy="45" r="26" fill="url(#sunGradient)" opacity="0.6" />

      {/* map on the ground */}
      <g transform="translate(90, 120) rotate(-4)">
        <rect x="0" y="0" width="150" height="90" rx="10" fill="#FFF7ED" stroke="#FBBF77" strokeWidth="2" />
        <path d="M20 20 Q 60 5, 90 25 T 130 20" stroke="#FB923C" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M15 55 Q 50 70, 85 50 T 135 60" stroke="#F97362" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="60" r="4" fill="#F43F5E" />
        <circle cx="105" cy="35" r="4" fill="#F43F5E" />
        <path d="M40 60 l0 -8 M36 56 l8 0" stroke="#F43F5E" strokeWidth="1.5" />
      </g>

      {/* friend 1 */}
      <g transform="translate(60, 70)">
        <circle cx="20" cy="15" r="14" fill="#F4A896" />
        <rect x="6" y="28" width="28" height="46" rx="14" fill="#FB7150" />
        <rect x="-4" y="95" width="14" height="30" rx="6" fill="#2B2420" transform="translate(10 0)" />
      </g>

      {/* friend 2 with backpack */}
      <g transform="translate(150, 55)">
        <circle cx="20" cy="15" r="14" fill="#E8B08C" />
        <rect x="6" y="28" width="28" height="46" rx="14" fill="#14B8A6" />
        <rect x="-6" y="34" width="14" height="30" rx="6" fill="#0D9488" />
      </g>

      {/* friend 3 */}
      <g transform="translate(230, 70)">
        <circle cx="20" cy="15" r="14" fill="#C98A5E" />
        <rect x="6" y="28" width="28" height="46" rx="14" fill="#FBBF24" />
      </g>

      {/* palm / plant accent */}
      <g transform="translate(310, 130)">
        <rect x="8" y="20" width="6" height="35" rx="3" fill="#B45309" />
        <path d="M11 20 C -5 10, -10 -5, 5 -8 C 8 5, 11 12, 11 20 Z" fill="#34D399" />
        <path d="M11 20 C 27 10, 32 -5, 17 -8 C 14 5, 11 12, 11 20 Z" fill="#10B981" />
        <path d="M11 20 C 5 2, 8 -12, 20 -10 C 15 0, 12 10, 11 20 Z" fill="#34D399" />
      </g>

      <defs>
        <radialGradient id="sunGradient" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FB923C" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
