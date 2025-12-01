const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase env vars missing', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
  throw new Error('Supabase auth not configured on server');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServiceRole = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

let app;
try {
  app = require('../src/server');
} catch (error) {
  console.error('Failed to initialize Express app:', error);
  throw error;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: 'Authorization header missing or malformed' };
  }

  const client = supabaseServiceRole || supabase;
  const { data, error } = await client.auth.getUser(token);
  return { user: data?.user || null, error: error?.message || null, token };
}

async function handleSignup(req, res) {
  try {
    const { email, password } = await readJsonBody(req);
    if (!email || !password) {
      return json(res, 400, { error: 'email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return json(res, 400, { error: error.message });
    }

    return json(res, 201, {
      ok: true,
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
    });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Internal Server Error' });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = await readJsonBody(req);
    if (!email || !password) {
      return json(res, 400, { error: 'email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return json(res, 401, { error: error.message });
    }

    return json(res, 200, {
      ok: true,
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
    });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Internal Server Error' });
  }
}

async function handleMe(req, res) {
  try {
    const { user, error } = await requireUser(req);
    if (error || !user) {
      return json(res, 401, { error: error || 'Invalid or expired token' });
    }

    return json(res, 200, { ok: true, user });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Internal Server Error' });
  }
}

async function handleDeleteMe(req, res) {
  try {
    if (!supabaseServiceRole) {
      return json(res, 500, { error: 'Supabase service role key not configured.' });
    }

    const { user, error } = await requireUser(req);
    if (error || !user) {
      return json(res, 401, { error: error || 'Invalid or expired token' });
    }

    const deleteResponse = await supabaseServiceRole.auth.admin.deleteUser(user.id);
    if (deleteResponse.error) {
      return json(res, 400, { error: deleteResponse.error.message });
    }

    return json(res, 200, { ok: true, message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Internal Server Error' });
  }
}

module.exports = async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/api/auth/signup' && req.method === 'POST') {
    return handleSignup(req, res);
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    return handleLogin(req, res);
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    return handleMe(req, res);
  }

  if (pathname === '/api/auth/me' && req.method === 'DELETE') {
    return handleDeleteMe(req, res);
  }

  return app(req, res);
};
