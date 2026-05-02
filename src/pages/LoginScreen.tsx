import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PlantGlyph } from "../components/PlantGlyph";
import { supabase } from "../lib/supabase";

export function LoginScreen() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setBusy(false);
  }

  return (
    <main className="phone-shell login">
      <div className="login-art">
        <PlantGlyph level={3} progress={0.65} />
      </div>
      <div className="login-copy">
        <p className="eyebrow">outside or it did not happen</p>
        <h1>TouchGrass</h1>
      </div>
      <button
        className="primary-action"
        disabled={busy}
        onClick={signIn}
        type="button"
      >
        {busy ? <Loader2 className="spin" size={18} /> : null}
        Sign in with Google
      </button>
    </main>
  );
}
