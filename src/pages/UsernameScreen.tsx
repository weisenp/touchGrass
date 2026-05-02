import type { Session } from "@supabase/supabase-js";
import { Check, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

export function UsernameScreen({
  session,
  onReady,
}: {
  session: Session;
  onReady: () => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,18}$/.test(clean)) {
      setError("Use 3-18 letters, numbers, or underscores.");
      return;
    }
    setBusy(true);
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
    await onReady();
  }

  return (
    <main className="phone-shell center setup">
      <div className="brand-mark">tg</div>
      <h1>Pick a username</h1>
      <form className="stack-form" onSubmit={save}>
        <input
          autoFocus
          placeholder="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-action" disabled={busy} type="submit">
          {busy ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
          Continue
        </button>
      </form>
    </main>
  );
}
