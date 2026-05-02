import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PlantGlyph } from "../components/PlantGlyph";
import { growthThreshold } from "../lib/plant";
import type { PlantState } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { Notice } from "../types/app";

export function PlantScreen({
  plant,
  onWater,
  setNotice,
}: {
  plant: PlantState;
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
      <div className="plant-metrics">
        <div>
          <span>waters</span>
          <strong>{plant.water_count}</strong>
        </div>
        <div>
          <span>growth</span>
          <strong>
            {plant.growth_points}/{threshold}
          </strong>
        </div>
        <div>
          <span>pity</span>
          <strong>{plant.pity_points}/3</strong>
        </div>
      </div>
      <PlantGlyph level={plant.level} progress={progress} />
      <button
        className="water-button"
        disabled={busy || plant.water_count < 1}
        onClick={water}
        type="button"
      >
        {busy ? <Loader2 className="spin" size={20} /> : null}
        Water
      </button>
    </div>
  );
}
