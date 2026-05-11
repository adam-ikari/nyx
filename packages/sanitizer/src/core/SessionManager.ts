import type { Session } from './types.js';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Manages sanitization sessions with mapping storage
 * Sessions are stored in-memory and cleared when the application closes
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * Create a new session
   */
  createSession(): Session {
    const id = generateId();
    const now = Date.now();
    const session: Session = {
      id,
      mapping: new Map(),
      createdAt: now,
      lastActivityAt: now
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
    return session || null;
  }

  /**
   * Get mapping for a session
   */
  getMapping(sessionId: string): Map<string, string> | null {
    const session = this.sessions.get(sessionId);
    return session?.mapping || null;
  }

  /**
   * Update mapping for a session
   */
  updateMapping(sessionId: string, mapping: Map<string, string>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.mapping = mapping;
      session.lastActivityAt = Date.now();
    }
  }

  /**
   * Add entries to existing mapping
   */
  addToMapping(sessionId: string, entries: Map<string, string>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      for (const [key, value] of entries) {
        session.mapping.set(key, value);
      }
      session.lastActivityAt = Date.now();
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Get session count
   */
  get size(): number {
    return this.sessions.size;
  }
}
