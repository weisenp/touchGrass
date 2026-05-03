import type { CSSProperties } from "react";

type PlantGlyphProps = {
  level: number;
  progress: number;
  icon?: string;
  isWatering?: boolean;
  isGrowing?: boolean;
};

export function PlantGlyph({
  level,
  progress,
  icon = "🌿",
  isWatering = false,
  isGrowing = false,
}: PlantGlyphProps) {
  const leaves = Math.min(8, Math.max(2, level + 2));

  return (
    <div
      className={`plant-stage${isWatering ? " watering" : ""}${isGrowing ? " growing" : ""}`}
      aria-label={`Plant level ${level}`}
      style={{ "--plant-progress": progress } as CSSProperties & Record<string, number>}
    >
      <div className="watering-can" aria-hidden="true">
        💧
      </div>
      <div className="water-rain" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, index) => (
          <span
            key={index}
            style={{ "--drop-index": index } as CSSProperties & Record<string, number>}
          />
        ))}
      </div>
      <div className="soil" />
      <div className="stem" />
      {Array.from({ length: leaves }).map((_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const offset = 48 + index * 19;
        return (
          <span
            className="leaf"
            key={index}
            style={{
              bottom: `${offset}px`,
              transform: `translateX(${side * (18 + index * 2)}px) rotate(${side * (30 + index * 4)}deg) scale(${0.76 + progress * 0.38})`,
            }}
          />
        );
      })}
      <div className="plant-icon-mark" aria-hidden="true">
        {icon}
      </div>
      <div className="plant-level-mark">Lv {level}</div>
    </div>
  );
}
