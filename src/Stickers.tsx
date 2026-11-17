type StickerKind = "bow" | "heart" | "sparkle" | "tape";

/** Small geometric journal decorations. Never an interactive control. */
export function Sticker({
  kind = "bow",
  className = "",
}: {
  kind?: StickerKind;
  className?: string;
}) {
  return (
    <svg
      className={`sticker sticker-${kind} ${className}`}
      width="80"
      height="72"
      viewBox="0 0 80 72"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "bow" && (
        <g stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
          <path
            className="sticker-fill"
            d="M36 31C27 14 9 13 10 26c0 14 17 15 26 12M44 31c9-17 27-18 26-5 0 14-17 15-26 12"
          />
          <path
            className="sticker-fill"
            d="m34 36-12 22 10-3 4 7 6-25m4-1 12 22-10-3-4 7-6-25"
          />
          <rect
            x="33"
            y="27"
            width="14"
            height="16"
            rx="6"
            className="sticker-fill"
          />
          <path d="m17 26 15 7m31-7-15 7" />
        </g>
      )}
      {kind === "heart" && (
        <g
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="sticker-fill"
            d="M40 58 17 36C1 18 27 5 40 23 53 5 79 18 63 36Z"
          />
          <path d="M22 24c2-3 5-3 8-2" />
        </g>
      )}
      {kind === "sparkle" && (
        <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path
            className="sticker-fill"
            d="m35 9 7 20 20 7-20 7-7 20-7-20-20-7 20-7Z"
          />
          <path d="m65 9 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        </g>
      )}
      {kind === "tape" && (
        <g transform="rotate(-8 40 36)">
          <path
            className="sticker-fill"
            stroke="currentColor"
            strokeWidth="1.5"
            d="m7 23 6 4-6 5 6 5-6 5 6 5h60l-6-5 6-5-6-5 6-5-6-4Z"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M23 32v7m11-7v7m11-7v7m11-7v7"
          />
        </g>
      )}
    </svg>
  );
}
