"use client";

export function Mascot({ talking, onClick }: { talking: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-auto block border-0 bg-transparent p-1 ${talking ? "talking" : ""}`}
      aria-label="dropmoltbot"
    >
      <svg className="mascot-svg h-[148px] w-[148px]" viewBox="0 0 256 256">
        <polygon
          points="94,28 162,28 214,80 214,148 162,200 94,200 42,148 42,80"
          fill="#0466C8"
          stroke="#00B4D8"
          strokeWidth="7"
        />
        <polygon
          points="108,52 148,52 178,82 178,122 148,152 108,152 78,122 78,82"
          fill="#0A1128"
        />
        <path
          className="eye"
          d="M92 96 Q110 78 128 96"
          fill="none"
          stroke="#F5F7FA"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle className="eye" cx="154" cy="100" r="16" fill="#F5F7FA" />
        <circle cx="158" cy="98" r="6" fill="#0A1128" />
        <path
          className="mouth"
          d="M100 150 Q132 176 168 142"
          fill="none"
          stroke="#F5F7FA"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <rect x="70" y="186" width="116" height="12" fill="#32D74B" />
        <rect x="186" y="44" width="18" height="18" fill="#00B4D8" />
      </svg>
    </button>
  );
}
