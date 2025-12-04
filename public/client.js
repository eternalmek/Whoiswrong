(async () => {
  await new Promise((resolve) => {
    if (window.__PUBLIC_CONFIG__) return resolve();
    const script = document.createElement('script');
    script.src = '/api/public-config.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });

  const config = window.__PUBLIC_CONFIG__ || {};
  if (!config.NEXT_PUBLIC_SUPABASE_URL || !config.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase env vars');
    return;
  }

  const { createClient } = window.supabase || {};
  if (!createClient) {
    console.error('Supabase client library not loaded');
    return;
  }

  const supabase = createClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  }

  async function signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  window.whoiswrongClient = {
    supabase,
    getUser,
    signInWithEmail,
    signOut,
    config,
  };
})();
