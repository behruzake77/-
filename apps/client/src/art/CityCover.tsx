/**
 * Cinematic cover — photoreal courtyard photo mixed with hand-drawn light and rain.
 * The photo provides the realism the player expects; the vector layer keeps it
 * legible and game-like, and ensures the cover works even if the photo fails to load.
 */
export function CityCover({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 560 720"
      role="img"
      aria-label="Двор в Северогорске вечером: окно, дерево, дождь и кошка"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3438" />
          <stop offset="0.55" stopColor="#3b3a36" />
          <stop offset="1" stopColor="#4a3f33" />
        </linearGradient>
        <linearGradient id="windowLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e5b56d" />
          <stop offset="1" stopColor="#b8793f" />
        </linearGradient>
        <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd79a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd79a" stopOpacity="0" />
        </radialGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
        </filter>
        <clipPath id="cover">
          <rect x="0" y="0" width="560" height="720" rx="10" />
        </clipPath>
      </defs>

      <g clipPath="url(#cover)">
        {/* photoreal base — realism the player asked for (AI-mixed workflow) */}
        <image href="/photo-courtyard.jpg" x="0" y="0" width="560" height="720" preserveAspectRatio="xMidYMid slice" />
        <rect width="560" height="720" fill="url(#sky)" opacity="0.28" />
        <rect width="560" height="720" fill="#15120f" opacity="0.16" />

        {/* distant rooflines — toned down so photo skyline shows */}
        <path
          d="M0 180 L70 150 L130 178 L210 132 L300 170 L380 140 L470 176 L560 148 L560 260 L0 260 Z"
          fill="#1f1d1a"
          opacity="0.38"
        />
        <g fill="#c9a26a" opacity="0.5">
          <rect x="92" y="186" width="6" height="8" />
          <rect x="238" y="168" width="6" height="8" />
          <rect x="332" y="182" width="6" height="8" />
          <rect x="492" y="176" width="6" height="8" />
        </g>

        {/* facade — now translucent, photo brick shows through (mix workflow) */}
        <rect x="0" y="210" width="560" height="330" fill="#4a3b33" opacity="0.42" />
        <rect x="0" y="210" width="560" height="14" fill="#2f231c" opacity="0.55" />
        <g stroke="#3a2d24" strokeWidth="1.2" opacity="0.28">
          {Array.from({ length: 14 }, (_, row) => 232 + row * 22).map((y) => (
            <line key={`brick-h-${y}`} x1="0" y1={y} x2="560" y2={y} />
          ))}
          {Array.from({ length: 13 }, (_, column) => column * 48).map((x, column) => (
            <g key={`brick-v-${x}`}>
              <line x1={x} y1={232 + (column % 3) * 22} x2={x} y2={254 + (column % 3) * 22} />
            </g>
          ))}
        </g>

        {/* windows — photo-lit, vector frames stay but glass is translucent */}
        {[
          [54, 268],
          [196, 268],
          [338, 268],
          [480, 268],
          [54, 400],
          [196, 400],
          [338, 400],
        ].map(([x, y]) => (
          <g key={`window-${x}-${y}`} opacity="0.96">
            <rect x={x - 6} y={y - 6} width="92" height="112" fill="#1e1916" opacity="0.85" />
            <rect x={x} y={y} width="80" height="100" fill="#2e3a42" opacity="0.72" />
            <path
              d={`M${x} ${y} L${x + 80} ${y} L${x + 80} ${y + 42} L${x} ${y + 56} Z`}
              fill="#4a565e"
              opacity="0.55"
            />
            <rect x={x + 38} y={y} width="4" height="100" fill="#33251f" />
            <rect x={x} y={y + 48} width="80" height="4" fill="#33251f" />
          </g>
        ))}

        {/* the one lit window */}
        <g>
          <rect x="474" y="394" width="92" height="118" fill="#33251f" />
          <rect x="480" y="400" width="80" height="106" fill="url(#windowLight)" />
          <rect x="518" y="400" width="4" height="106" fill="#33251f" />
          <rect x="480" y="448" width="80" height="4" fill="#33251f" />
          <path d="M482 500 q20 -16 38 -2 q18 12 38 -4 v12 h-76 z" fill="#8a3d2f" opacity="0.35" />
          <rect x="486" y="468" width="26" height="32" fill="#2f2a24" opacity="0.35" />
          <ellipse cx="526" cy="502" rx="66" ry="46" fill="url(#lampGlow)" opacity="0.8" />
        </g>

        {/* entrance door — photo concrete underneath, vector door on top */}
        <g opacity="0.96">
          <rect x="292" y="470" width="88" height="70" fill="#1e1916" opacity="0.9" />
          <rect x="298" y="476" width="76" height="64" fill="#3b3129" />
          <line x1="336" y1="478" x2="336" y2="538" stroke="#241c17" strokeWidth="3" />
          <circle cx="330" cy="508" r="2.5" fill="#c9a26a" />
          <rect x="278" y="446" width="116" height="24" fill="#2a211b" />
          <text
            x="336"
            y="463"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="13"
            fill="#d8c7a8"
            letterSpacing="2"
          >
            ПОДЪЕЗД 1
          </text>
        </g>

        {/* ground — translucent so photo wet asphalt shows */}
        <rect x="0" y="540" width="560" height="180" fill="#2e2c28" opacity="0.52" />
        <path
          d="M0 560 q140 -12 280 0 q150 14 280 -2 l0 14 q-140 12 -280 0 q-140 -12 -280 0z"
          fill="#3a3834"
          opacity="0.38"
        />

        {/* puddles */}
        <g>
          <ellipse cx="150" cy="620" rx="98" ry="20" fill="#55636a" opacity="0.65" />
          <ellipse cx="150" cy="618" rx="74" ry="12" fill="#6f8b94" opacity="0.35" />
          <ellipse cx="392" cy="664" rx="120" ry="24" fill="#4d5a61" opacity="0.6" />
          <ellipse cx="392" cy="662" rx="88" ry="14" fill="#718d95" opacity="0.28" />
          <g stroke="#b9c7cc" strokeWidth="1" opacity="0.35">
            <ellipse cx="140" cy="618" rx="34" ry="6" fill="none" />
            <ellipse cx="402" cy="662" rx="46" ry="8" fill="none" />
          </g>
        </g>

        {/* tree */}
        <g>
          <path d="M74 540 q-4 -90 10 -142 l14 0 q-10 70 2 142z" fill="#d8d2c4" />
          <g fill="#3a3733">
            <rect x="74" y="432" width="12" height="4" />
            <rect x="82" y="470" width="16" height="4" />
            <rect x="78" y="500" width="10" height="3" />
            <rect x="86" y="520" width="12" height="3" />
          </g>
          <g fill="#6c7a4b">
            <circle cx="86" cy="386" r="58" />
            <circle cx="42" cy="414" r="40" />
            <circle cx="130" cy="418" r="44" />
            <circle cx="72" cy="342" r="36" />
          </g>
          <g fill="#8a7d44" opacity="0.8">
            <circle cx="60" cy="360" r="24" />
            <circle cx="116" cy="392" r="22" />
            <circle cx="46" cy="436" r="18" />
          </g>
          <g fill="#b08a44" opacity="0.85">
            <circle cx="96" cy="352" r="7" />
            <circle cx="58" cy="402" r="6" />
            <circle cx="124" cy="430" r="6" />
          </g>
        </g>

        {/* bench */}
        <g>
          <rect x="196" y="556" width="132" height="8" fill="#6b5138" />
          <rect x="196" y="568" width="132" height="8" fill="#5c422d" />
          <rect x="204" y="576" width="7" height="20" fill="#3f2d1e" />
          <rect x="314" y="576" width="7" height="20" fill="#3f2d1e" />
          <rect x="200" y="540" width="124" height="6" fill="#7b5a3e" />
        </g>

        {/* street lamp */}
        <g>
          <circle cx="452" cy="404" r="86" fill="url(#lampGlow)" />
          <rect x="448" y="414" width="8" height="128" fill="#2f3538" />
          <rect x="440" y="536" width="24" height="8" fill="#2f3538" />
          <rect x="432" y="396" width="40" height="24" rx="4" fill="#2f3538" />
          <rect x="438" y="400" width="28" height="16" rx="2" fill="#e4bd76" />
        </g>

        {/* figure with suitcase */}
        <g transform="translate(364 520)">
          <ellipse cx="0" cy="96" rx="34" ry="9" fill="#000000" opacity="0.3" />
          <rect x="-12" y="72" width="9" height="24" rx="3" fill="#3d4533" />
          <rect x="6" y="72" width="9" height="24" rx="3" fill="#3d4533" />
          <rect x="-15" y="20" width="34" height="56" rx="11" fill="#5b6247" />
          <rect x="-15" y="62" width="34" height="10" rx="4" fill="#3d4533" />
          <circle cx="2" cy="8" r="13" fill="#dfb392" />
          <path d="M-11 4 q6 -16 25 -10 q6 2 8 10 q-18 -6 -33 0z" fill="#3b2a20" />
          <rect x="16" y="24" width="8" height="34" rx="4" fill="#4c5339" />
          <rect x="24" y="66" width="26" height="32" rx="3" fill="#6b4f30" />
          <rect x="24" y="66" width="26" height="6" rx="2" fill="#8a6a43" />
          <rect x="34" y="62" width="6" height="6" rx="2" fill="#3f2d1e" />
        </g>

        {/* cat */}
        <g transform="translate(268 606)">
          <ellipse cx="0" cy="18" rx="22" ry="5" fill="#000000" opacity="0.25" />
          <ellipse cx="0" cy="6" rx="22" ry="13" fill="#6f6c66" />
          <circle cx="16" cy="-6" r="11" fill="#8d8a84" />
          <path d="M8 -12 l4 -11 l6 9z" fill="#63605b" />
          <path d="M19 -14 l4 -10 l5 10z" fill="#63605b" />
          <circle cx="13" cy="-7" r="1.2" fill="#d9d2c4" />
          <circle cx="19" cy="-7" r="1.2" fill="#d9d2c4" />
          <path
            d="M-22 10 q-14 8 -6 20"
            fill="none"
            stroke="#6f6c66"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* rain */}
        <g stroke="#c8d6de" strokeWidth="1" opacity="0.3">
          {Array.from({ length: 46 }).map((_, i) => {
            const x = (i * 97) % 560;
            const y = (i * 53) % 700;
            return <line key={`rain-${x}-${y}`} x1={x} y1={y} x2={x - 5} y2={y + 18} />;
          })}
        </g>

        <rect width="560" height="720" filter="url(#grain)" opacity="0.5" />
        <rect
          x="0"
          y="0"
          width="560"
          height="720"
          fill="none"
          stroke="#1b1712"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
