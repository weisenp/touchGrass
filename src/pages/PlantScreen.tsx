import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PlantGlyph } from "../components/PlantGlyph";
import { growthThreshold } from "../lib/plant";
import type { PlantChoice } from "../lib/plants";
import type { PlantState } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { Notice } from "../types/app";

export function PlantScreen({
  plant,
  plantChoice,
  onWater,
  setNotice,
}: {
  plant: PlantState;
  plantChoice: PlantChoice;
  onWater: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [busy, setBusy] = useState(false);
  const threshold = growthThreshold(plant.level);
  const progress = Math.min(1, plant.growth_points / threshold);

  async function water() {
    if (!supabase || busy || plant.water_count < 1) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("water_plant");
    setBusy(false);
    if (error) {
      setNotice({ tone: "bad", text: error.message });
      return;
    }
    const result = data as { grew: boolean; leveled_up: boolean } | null;
    setNotice({
      tone: result?.grew ? "ok" : "warn",
      text: result?.leveled_up
        ? "Level up."
        : result?.grew
          ? "Growth took."
          : "No growth this time.",
    });
    await onWater();
  }

  return (
    <div className="plant-screen">
      <div className="plant-header-card">
        <div className="pill">
          Level <span>{plant.level}</span>
        </div>
        <div className="xp-text">
          {plant.growth_points} / {threshold} growth
        </div>
      </div>

      <PlantGlyph
        level={plant.level}
        progress={progress}
        icon={plantChoice.icon}
      />

      <div className="xp-wrap" aria-hidden="true">
        <div className="xp-bar" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="plant-water-row">
        <div className="drop-row" aria-label={`${plant.water_count} waters`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span
              className={index < plant.water_count ? "drop filled" : "drop"}
              key={index}
            />
          ))}
        </div>
        
        <button
          className="water-btn"
          disabled={busy || plant.water_count < 1}
          onClick={water}
          type="button"
          title="Water plant"
        >
          {busy ? <Loader2 className="spin" size={20} /> : "💧"}
        </button>
      </div>

      <p className="plant-msg">
        {plant.water_count > 0
          ? "Spend a water for a growth roll. Posting outside earns more."
          : "No water left. Post from outside to refill your watering can."}
      </p>
    </div>
  );
}
