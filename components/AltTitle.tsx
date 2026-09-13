"use client";

export function AltTitle({ lines }: { lines: string[] }) {
  return (
    <h1 className="mt-2 text-[clamp(26px,2.4vw,34px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ice">
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 ? <br /> : null}
          {[...line].map((c, i) =>
            c === " " ? (
              <span key={`${li}-${i}`} className="sp" />
            ) : (
              <span key={`${li}-${i}`} className="ch">
                {c}
              </span>
            ),
          )}
        </span>
      ))}
    </h1>
  );
}
