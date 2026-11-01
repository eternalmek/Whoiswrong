(() => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const judgeId = params.get('judgeId');
  const stripeSessionId = params.get('session_id');
  const title = document.getElementById('purchaseTitle');
  const status = document.getElementById('purchaseStatus');
  const retry = document.getElementById('retryPurchase');

  async function verify() {
    retry.hidden = true;
    retry.disabled = true;
    if (!stripeSessionId || !['single', 'subscription'].includes(mode) || (mode === 'single' && !judgeId)) {
      title.textContent = 'Purchase reference missing';
      status.textContent = 'Open the return link from your completed checkout. This page alone does not confirm payment.';
      return;
    }
    const pending = { mode, purchaseType: mode, judgeId, stripeSessionId, timestamp: Date.now() };
    localStorage.setItem('pendingPurchase', JSON.stringify(pending));
    const token = localStorage.getItem('accessToken');
    if (!token) {
      title.textContent = 'Log in to confirm your purchase';
      status.textContent = 'Return to the app and log in with the account used at checkout. Your purchase reference is saved for verification.';
      return;
    }
    try {
      const response = await fetch('/api/purchases/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pending),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || result.message || 'Verification could not be completed. Please retry.');
      localStorage.removeItem('pendingPurchase');
      title.textContent = 'Your purchase is confirmed';
      status.textContent = 'Your access is saved to your account. Return to the app to use your judges.';
    } catch (error) {
      title.textContent = 'We could not confirm access yet';
      status.textContent = error.message;
      retry.hidden = false;
      retry.disabled = false;
    }
  }
  retry.addEventListener('click', verify);
  verify();
})();
