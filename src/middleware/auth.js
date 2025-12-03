const {
  verifyAuthToken,
  supabaseConfigIssues,
  supabaseServiceRole,
} = require('../supabaseClient');

function extractBearerToken(req) {
  const authHeader = req.headers?.authorization || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function requireUser(req, res, next) {
  try {
    if (!supabaseServiceRole) {
      return res.status(503).json({
        error: 'Supabase auth not configured on server.',
        details: supabaseConfigIssues?.length ? supabaseConfigIssues : undefined,
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const { user, error } = await verifyAuthToken(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.auth = { user, token };
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalUser(req, res, next) {
  try {
    if (!supabaseServiceRole) return next();

    const token = extractBearerToken(req);
    if (!token) return next();

    const { user } = await verifyAuthToken(token);
    if (user) {
      req.auth = { user, token };
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireUser,
  optionalUser,
};
