import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Sanitizer, SessionManager } from '@nyx-proxy/sanitizer';

const app = new Hono();

// Enable CORS for frontend
app.use('/*', cors());

// Session manager (in-memory for MVP)
const sessionManager = new SessionManager();

// Default LLM config (can be overridden per request)
const defaultConfig = {
  endpoint: process.env.LLM_ENDPOINT || 'http://localhost:11434/v1',
  model: process.env.LLM_MODEL || 'gemma4',
  apiKey: process.env.LLM_API_KEY,
  timeout: 30000
};

/**
 * POST /api/sanitize
 * Sanitize text by replacing sensitive content with placeholders
 *
 * Body: { text: string, config?: Partial<SanitizerConfig> }
 * Returns: { sanitized: string, sessionId: string }
 */
app.post('/api/sanitize', async (c) => {
  try {
    const body = await c.req.json();
    const { text, config } = body;

    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }

    // Merge config with defaults
    const sanitizerConfig = {
      ...defaultConfig,
      ...config
    };

    const sanitizer = new Sanitizer(sanitizerConfig);
    const result = await sanitizer.sanitize(text);

    // Create session and store mapping
    const session = sessionManager.createSession();
    sessionManager.updateMapping(session.id, result.mapping);

    return c.json({
      sanitized: result.sanitized,
      sessionId: session.id,
      detection: result.detection
    });
  } catch (error) {
    console.error('Sanitize error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Sanitization failed'
    }, 500);
  }
});

/**
 * POST /api/restore
 * Restore sanitized text using session mapping
 *
 * Body: { text: string, sessionId: string }
 * Returns: { restored: string, complete: boolean }
 */
app.post('/api/restore', async (c) => {
  try {
    const body = await c.req.json();
    const { text, sessionId } = body;

    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }

    if (!sessionId) {
      return c.json({ error: 'Session ID is required' }, 400);
    }

    // Get mapping from session
    const mapping = sessionManager.getMapping(sessionId);
    if (!mapping) {
      return c.json({ error: 'Session not found or expired' }, 404);
    }

    const sanitizer = new Sanitizer(defaultConfig);
    const result = sanitizer.restore(text, mapping);

    return c.json({
      restored: result.restored,
      complete: result.complete,
      missing: result.missing
    });
  } catch (error) {
    console.error('Restore error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Restoration failed'
    }, 500);
  }
});

/**
 * GET /api/session/:id
 * Get session info
 */
app.get('/api/session/:id', (c) => {
  const sessionId = c.req.param('id');
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({
    id: session.id,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    mappingSize: session.mapping.size
  });
});

/**
 * DELETE /api/session/:id
 * Delete a session
 */
app.delete('/api/session/:id', (c) => {
  const sessionId = c.req.param('id');
  const deleted = sessionManager.deleteSession(sessionId);

  if (!deleted) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * GET /api/config
 * Get current LLM configuration (without sensitive data)
 */
app.get('/api/config', (c) => {
  return c.json({
    endpoint: defaultConfig.endpoint,
    model: defaultConfig.model,
    timeout: defaultConfig.timeout,
    hasApiKey: !!defaultConfig.apiKey
  });
});

/**
 * POST /api/config
 * Update LLM configuration (for this session)
 */
app.post('/api/config', async (c) => {
  const body = await c.req.json();

  // Update defaults (in production, this would be per-user)
  if (body.endpoint) defaultConfig.endpoint = body.endpoint;
  if (body.model) defaultConfig.model = body.model;
  if (body.apiKey) defaultConfig.apiKey = body.apiKey;
  if (body.timeout) defaultConfig.timeout = body.timeout;

  return c.json({ success: true });
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', sessions: sessionManager.size });
});

export default app;
