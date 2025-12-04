async function initHome() {
  const statusEl = document.getElementById('status');
  const form = document.getElementById('judge-form');
  const verdictBox = document.getElementById('verdict-box');
  const feedList = document.getElementById('feed-list');
  const judgeSelect = document.getElementById('judge-select');

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
  }

  async function loadJudges() {
    if (!window.whoiswrongClient?.supabase) return;
    const { supabase } = window.whoiswrongClient;
    const { data, error } = await supabase
      .from('judges')
      .select('id, name, slug, is_default, is_celebrity')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      judgeSelect.innerHTML = '<option value="classic">Classic Judge</option>';
      return;
    }

    judgeSelect.innerHTML = '';
    const judges = data?.length ? data : [{ id: 'classic', name: 'Classic Judge', slug: 'classic' }];
    for (const judge of judges) {
      const option = document.createElement('option');
      option.value = judge.slug || judge.id;
      option.textContent = judge.name;
      judgeSelect.appendChild(option);
    }
  }

  async function loadFeed() {
    try {
      const response = await fetch('/api/judgements/feed');
      const payload = await response.json();
      feedList.innerHTML = '';

      if (!payload.judgements || payload.judgements.length === 0) {
        feedList.innerHTML = '<li>No public judgements yet.</li>';
        return;
      }

      payload.judgements.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${item.judges?.name || 'Judge'}:</strong> ${
          item.verdict_text || 'No verdict'
        }<div class="question">Q: ${item.question_text || ''}</div>`;
        feedList.appendChild(li);
      });
    } catch (error) {
      console.error('Feed error', error);
      feedList.innerHTML = '<li>Unable to load feed.</li>';
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    const question_text = form.question.value.trim();
    const side_a = form.sideA.value.trim() || null;
    const side_b = form.sideB.value.trim() || null;
    const judge_id = judgeSelect.value;

    if (!question_text) {
      setStatus('Please enter a question.');
      return;
    }

    setStatus('Asking the judge...');
    verdictBox.textContent = '';

    const headers = { 'Content-Type': 'application/json' };
    const { supabase } = window.whoiswrongClient || {};
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch('/api/judge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ question_text, side_a, side_b, judge_id }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error || 'Unable to get a verdict.');
      return;
    }

    verdictBox.textContent = payload.verdict || 'No verdict available.';
    setStatus(payload.saved ? 'Verdict saved to your account.' : 'Verdict ready.');
    loadFeed();
  }

  form.addEventListener('submit', submitForm);
  await loadJudges();
  await loadFeed();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.whoiswrongClient) {
    initHome();
  } else {
    setTimeout(initHome, 400);
  }
});
