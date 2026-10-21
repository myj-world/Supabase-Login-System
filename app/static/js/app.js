const env = window.__ENV__ || {};
let supabaseClient = null;
let session = null;
let lastProcessedAccessToken = null;

function el(id) {
  return document.getElementById(id);
}

function showView(viewName) {
  document.querySelectorAll('.view').forEach((view) => view.classList.add('hidden'));
  el(`${viewName}-view`)?.classList.remove('hidden');
}

function showToast(message, type = 'info') {
  const toast = el('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  window.setTimeout(() => toast.classList.remove('show'), 4000);
}

function setLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  if (loading) {
    button.dataset.originalHtml ||= button.innerHTML;
    button.innerHTML = '<span class="spinner"></span> Please wait...';
  } else if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
  }
}

function initSupabase() {
  if (!env.supabaseUrl || !env.supabaseKey || !window.supabase?.createClient) {
    return null;
  }
  return window.supabase.createClient(env.supabaseUrl, env.supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

function decodeAal(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    return json.aal || null;
  } catch (error) {
    console.error('Could not read the authentication assurance level:', error);
    return null;
  }
}

function showAuth() {
  el('signed-in-email').textContent = '';
  showView('auth');
}

function showMfaError(error) {
  el('mfa-error-message').textContent =
    error?.message || 'MFA setup failed. Please try again.';
  showView('mfa-error');
}

function updateMfaBadge(verified) {
  const badge = el('mfa-badge');
  badge.textContent = verified ? 'MFA verified' : 'MFA required';
  badge.classList.toggle('verified', verified);
}

async function cleanupStaleMfaFactors() {
  const { data, error } = await supabaseClient.auth.mfa.listFactors();
  if (error) throw error;

  for (const factor of (data?.totp || []).filter((item) => item.status === 'unverified')) {
    const { error: unenrollError } = await supabaseClient.auth.mfa.unenroll({
      factorId: factor.id,
    });
    if (unenrollError) {
      throw new Error(`Could not remove unfinished MFA setup: ${unenrollError.message}`);
    }
  }
}

async function prepareMfaStep() {
  const { data, error } = await supabaseClient.auth.mfa.listFactors();
  if (error) throw error;

  const verified = (data?.totp || []).find((factor) => factor.status === 'verified');
  if (verified) return { type: 'challenge', factorId: verified.id };

  await cleanupStaleMfaFactors();
  const { data: refreshed, error: refreshError } = await supabaseClient.auth.mfa.listFactors();
  if (refreshError) throw refreshError;

  const refreshedFactor = (refreshed?.totp || []).find(
    (factor) => factor.status === 'verified'
  );
  return refreshedFactor
    ? { type: 'challenge', factorId: refreshedFactor.id }
    : { type: 'enroll' };
}

function showMfaChallenge(factorId) {
  el('mfa-challenge-factor-id').value = factorId;
  showView('mfa-challenge');
}

async function enrollMfa() {
  const { data, error } = await supabaseClient.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  el('mfa-factor-id').value = data.id;
  el('mfa-qr').innerHTML = data.totp.qr_code;
  showView('mfa');
}

async function onSessionReady() {
  if (!session) {
    showAuth();
    return;
  }
  if (session.access_token === lastProcessedAccessToken) return;
  lastProcessedAccessToken = session.access_token;

  if (!env.requireAuth || !env.requireMfa || decodeAal(session.access_token) === 'aal2') {
    updateMfaBadge(decodeAal(session.access_token) === 'aal2');
    el('signed-in-email').textContent = session.user?.email || 'Signed in';
    showView('account');
    return;
  }

  try {
    const step = await prepareMfaStep();
    if (step.type === 'challenge') showMfaChallenge(step.factorId);
    else await enrollMfa();
  } catch (error) {
    console.error('MFA flow failed:', error);
    lastProcessedAccessToken = null;
    showMfaError(error);
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = event.submitter;
  setLoading(button, true);
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
    });
    if (error) throw error;
    session = data.session;
    await onSessionReady();
  } catch (error) {
    console.error('Sign in failed:', error);
    showToast(error.message || 'Sign in failed. Check your email and password.', 'error');
  } finally {
    setLoading(button, false);
  }
}

async function handleSignUp(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = event.submitter;
  setLoading(button, true);
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;

    const notice = el('auth-notice');
    if (data.session) {
      session = data.session;
      notice.textContent = 'Account created. Confirm your email, then complete MFA setup.';
      notice.classList.remove('hidden');
      await onSessionReady();
    } else {
      notice.textContent = 'Confirmation email sent. Confirm your email before signing in.';
      notice.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Sign up failed:', error);
    showToast(error.message || 'Sign up failed. Please try again.', 'error');
  } finally {
    setLoading(button, false);
  }
}

async function verifyMfaEnrollment(event) {
  event.preventDefault();
  const button = event.submitter;
  setLoading(button, true);
  try {
    const { error } = await supabaseClient.auth.mfa.challengeAndVerify({
      factorId: el('mfa-factor-id').value,
      code: el('mfa-code').value.trim(),
    });
    if (error) throw error;
    updateMfaBadge(true);
    lastProcessedAccessToken = null;
    session = (await supabaseClient.auth.getSession()).data.session;
    await onSessionReady();
  } catch (error) {
    console.error('MFA enrollment verification failed:', error);
    showToast(error.message || 'Invalid MFA code. Please try again.', 'error');
  } finally {
    setLoading(button, false);
  }
}

async function verifyMfaChallenge(event) {
  event.preventDefault();
  const button = event.submitter;
  setLoading(button, true);
  try {
    const factorId = el('mfa-challenge-factor-id').value;
    const { data: challenge, error: challengeError } =
      await supabaseClient.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;

    const { error } = await supabaseClient.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: el('mfa-challenge-code').value.trim(),
    });
    if (error) throw error;
    updateMfaBadge(true);
    lastProcessedAccessToken = null;
    session = (await supabaseClient.auth.getSession()).data.session;
    await onSessionReady();
  } catch (error) {
    console.error('MFA challenge failed:', error);
    showToast(error.message || 'Invalid MFA code. Please try again.', 'error');
  } finally {
    setLoading(button, false);
  }
}

async function handleSignOut() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    session = null;
    lastProcessedAccessToken = null;
    showAuth();
  } catch (error) {
    console.error('Sign out failed:', error);
    showToast(error.message || 'Sign out failed. Please try again.', 'error');
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  el('signin-form').classList.toggle('hidden', tabName !== 'signin');
  el('signup-form').classList.toggle('hidden', tabName !== 'signup');
  el('auth-notice').classList.add('hidden');
}

async function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const errorDescription =
    params.get('error_description') || hashParams.get('error_description');
  if (errorDescription) {
    showAuth();
    el('auth-notice').textContent = `Email confirmation failed: ${errorDescription}`;
    el('auth-notice').classList.remove('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }

  const code = params.get('code');
  if (!code) return false;
  try {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
    session = data.session;
    window.history.replaceState({}, document.title, window.location.pathname);
    await onSessionReady();
  } catch (error) {
    console.error('Email confirmation failed:', error);
    showAuth();
    el('auth-notice').textContent =
      error.message || 'Email confirmation could not be completed. Request a new email and try again.';
    el('auth-notice').classList.remove('hidden');
  }
  return true;
}

async function bootstrap() {
  el('startup-view').classList.add('hidden');
  supabaseClient = initSupabase();
  el('signin-form').addEventListener('submit', handleSignIn);
  el('signup-form').addEventListener('submit', handleSignUp);
  el('mfa-form').addEventListener('submit', verifyMfaEnrollment);
  el('mfa-challenge-form').addEventListener('submit', verifyMfaChallenge);
  el('sign-out-btn').addEventListener('click', handleSignOut);
  el('mfa-retry-btn').addEventListener('click', () => {
    lastProcessedAccessToken = null;
    onSessionReady().catch(showMfaError);
  });
  el('mfa-error-sign-out-btn').addEventListener('click', handleSignOut);
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  if (!supabaseClient) {
    showAuth();
    el('auth-notice').textContent =
      'Authentication is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.';
    el('auth-notice').classList.remove('hidden');
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;
    if (newSession) {
      window.setTimeout(() => {
        onSessionReady().catch(showMfaError);
      }, 0);
    } else {
      lastProcessedAccessToken = null;
      showAuth();
    }
  });

  if (await handleAuthRedirect()) return;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  session = data.session;
  await onSessionReady();
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error('Authentication app startup failed:', error);
    showAuth();
    el('auth-notice').textContent = 'Authentication could not be started. Check configuration and reload.';
    el('auth-notice').classList.remove('hidden');
  });
});
