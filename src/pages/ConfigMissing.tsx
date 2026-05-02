export function ConfigMissing() {
  return (
    <main className="phone-shell center setup">
      <div className="brand-mark">tg</div>
      <h1>TouchGrass</h1>
      <p>
        Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to run
        the Supabase MVP.
      </p>
      <code>cp .env.example .env</code>
    </main>
  );
}
