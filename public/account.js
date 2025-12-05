async function initAccount() {
  const statusEl = document.getElementById('account-status');
  const profilePillEl = document.getElementById('profile-pill');
  const judgementsFeedEl = document.getElementById('judgements-feed');
  const receiptsListEl = document.getElementById('receipts-list');
  const settingsForm = document.getElementById('settings-form');

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message || '';
  }

  if (!window.whoiswrongClient?.supabase) {
    setStatus('Unable to connect to Supabase.');
    return;
  }

  const { supabase } = window.whoiswrongClient;
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    setStatus('You must log in to access your account.');
    const prompt = document.getElementById('login-prompt');
    prompt.classList.remove('hidden');
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('login-email').value;
      try {
        await supabase.auth.signInWithOtp({ email });
        setStatus('Check your email for a login link.');
      } catch (err) {
        console.error('Login error', err);
        setStatus('Unable to send magic link.');
      }
    });
    return;
  }

  async function fetchOrCreateProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: null, full_name: null })
      .select('*')
      .maybeSingle();
    if (insertError) throw insertError;
    return inserted;
  }

  async function fetchSettings() {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    const defaultSettings = { user_id: user.id, theme: 'light', language: 'en', marketing_opt_in: false };
    const { data: inserted, error: insertError } = await supabase
      .from('user_settings')
      .upsert(defaultSettings)
      .select('*')
      .maybeSingle();
    if (insertError) throw insertError;
    return inserted;
  }

  async function loadLists() {
    const [judgements] = await Promise.all([
      supabase
        .from('judgements')
        .select('id, question_text, verdict_text, created_at, judges(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (judgements.error) throw judgements.error;

    if (judgementsFeedEl) {
      judgementsFeedEl.innerHTML = judgements.data.length
        ? judgements.data
            .map(
              (j) =>
                `<div class="bg-gray-900 border border-gray-800 rounded-xl p-3"><p class="text-white text-sm font-semibold">${j.judges?.name || 'Judge'}</p><p class="text-gray-400 text-xs mt-1">${j.verdict_text}</p><p class="text-gray-500 text-xs mt-2">Q: ${j.question_text}</p></div>`
            )
            .join('')
        : '<p class="text-gray-500 text-sm">No judgements yet.</p>';
    }
  }

  try {
    setStatus('Loading your account...');
    const profile = await fetchOrCreateProfile();
    const settings = await fetchSettings();
    setStatus('');

    // Show account content
    const accountContent = document.getElementById('account-content');
    if (accountContent) accountContent.classList.remove('hidden');

    if (profilePillEl) profilePillEl.textContent = profile.username || user.email;
    document.getElementById('setting-theme').value = settings.theme || 'light';
    document.getElementById('setting-language').value = settings.language || 'en';
    document.getElementById('setting-marketing').checked = !!settings.marketing_opt_in;

    // Populate profile form fields
    const fullNameInput = document.getElementById('profile-full-name');
    const usernameInput = document.getElementById('profile-username');
    if (fullNameInput) fullNameInput.value = profile.full_name || '';
    if (usernameInput) usernameInput.value = profile.username || '';

    await loadLists();
  } catch (error) {
    console.error('Account load failed', error);
    setStatus('We could not load your data.');
  }

  settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      user_id: user.id,
      theme: document.getElementById('setting-theme').value,
      language: document.getElementById('setting-language').value,
      marketing_opt_in: document.getElementById('setting-marketing').checked,
    };
    const { error } = await supabase.from('user_settings').upsert(payload);
    if (error) {
      console.error('Supabase error:', error);
      setStatus('Unable to save settings.');
    } else {
      setStatus('Settings saved.');
    }
  });

  // Profile form handler
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        id: user.id,
        full_name: document.getElementById('profile-full-name').value,
        username: document.getElementById('profile-username').value,
      };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) {
        console.error('Supabase error:', error);
        setStatus('Unable to save profile.');
      } else {
        setStatus('Profile saved.');
        if (profilePillEl) profilePillEl.textContent = payload.username || user.email;
      }
    });
  }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.whoiswrongClient) {
    initAccount();
  } else {
    setTimeout(initAccount, 400);
  }
});
