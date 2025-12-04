async function initAccount() {
  const statusEl = document.getElementById('account-status');
  const profileEl = document.getElementById('profile');
  const questionsEl = document.getElementById('questions');
  const judgementsEl = document.getElementById('judgements');
  const friendsEl = document.getElementById('friends');
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
    const [questions, judgements, friends] = await Promise.all([
      supabase.from('questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase
        .from('judgements')
        .select('id, question_text, verdict_text, created_at, judges(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`)
        .limit(10),
    ]);

    if (questions.error) throw questions.error;
    if (judgements.error) throw judgements.error;
    if (friends.error) throw friends.error;

    questionsEl.innerHTML = questions.data.length
      ? questions.data.map((q) => `<li>${q.text}</li>`).join('')
      : '<li>No questions yet.</li>';

    judgementsEl.innerHTML = judgements.data.length
      ? judgements.data
          .map(
            (j) =>
              `<li><strong>${j.judges?.name || 'Judge'}:</strong> ${j.verdict_text}<div class="question">Q: ${j.question_text}</div></li>`
          )
          .join('')
      : '<li>No judgements yet.</li>';

    friendsEl.innerHTML = friends.data.length
      ? friends.data.map((f) => `<li>${f.status} with ${f.friend_user_id}</li>`).join('')
      : '<li>No friends yet.</li>';
  }

  try {
    setStatus('Loading your account...');
    const profile = await fetchOrCreateProfile();
    const settings = await fetchSettings();
    setStatus('');

    profileEl.textContent = profile.username || user.email;
    document.getElementById('setting-theme').value = settings.theme || 'light';
    document.getElementById('setting-language').value = settings.language || 'en';
    document.getElementById('setting-marketing').checked = !!settings.marketing_opt_in;

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
