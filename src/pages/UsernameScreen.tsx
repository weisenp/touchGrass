import type { Session } from "@supabase/supabase-js";
import { Check, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { PLANT_OPTIONS } from "../lib/plants";
import type { Profile } from "../lib/supabase";
import { supabase } from "../lib/supabase";

export function UsernameScreen({
  session,
  profile,
  onPlantSelected,
  onReady,
}: {
  session: Session;
  profile: Profile | null;
  onPlantSelected: (plantKey: string) => void;
  onReady: () => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [plantKey, setPlantKey] = useState(PLANT_OPTIONS[0].key);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsUsername = !profile;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);

    if (needsUsername) {
      const clean = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,18}$/.test(clean)) {
        setError("Use 3-18 letters, numbers, or underscores.");
        setBusy(false);
        return;
      }
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        username: clean,
        display_name: session.user.user_metadata.full_name ?? clean,
        avatar_url: session.user.user_metadata.avatar_url ?? null,
      });
      if (upsertError) {
        setError(upsertError.message);
        setBusy(false);
        return;
      }
    }

    onPlantSelected(plantKey);
    await onReady();
  }

  return (
    <main className="phone-shell setup">
      <form className="onboard-wrap" onSubmit={save}>
        <div className="onboard-card">
          <div className="step-dots" aria-hidden="true">
            <span className="step-dot active" />
            <span className="step-dot active" />
            <span className="step-dot" />
          </div>
          <h1>{needsUsername ? "Set up TouchGrass" : "Pick your plant"}</h1>
          <p className="onboard-sub">
            Choose the plant that grows when you post from outside.
          </p>

          {needsUsername ? (
            <input
              autoFocus
              className="setup-input"
              placeholder="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          ) : null}

          <div className="plant-grid" role="radiogroup" aria-label="Plant">
            {PLANT_OPTIONS.map((plant) => (
              <button
                className={
                  plant.key === plantKey ? "plant-opt selected" : "plant-opt"
                }
                key={plant.key}
                onClick={() => setPlantKey(plant.key)}
                role="radio"
                aria-checked={plant.key === plantKey}
                type="button"
              >
                <span className="plant-opt-icon">{plant.icon}</span>
                <span className="plant-opt-name">{plant.name}</span>
              </button>
            ))}
          </div>

          <button className="primary-action" disabled={busy} type="submit">
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            Start growing
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </main>
  );
}
