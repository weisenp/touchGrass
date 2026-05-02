type PlantGlyphProps = {
  level: number;
  progress: number;
  icon?: string;
};

export function PlantGlyph({ level, progress, icon = "🌿" }: PlantGlyphProps) {
  const leaves = Math.min(8, Math.max(2, level + 2));

  return (
    <div className="plant-stage" aria-label={`Plant level ${level}`}>
      <div className="soil" />
      <div className="stem" style={{ height: `${88 + progress * 72}px` }} />
      {Array.from({ length: leaves }).map((_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const offset = 44 + index * 17;
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
