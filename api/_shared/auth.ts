import type { VercelRequest } from '@vercel/node';
import crypto from 'crypto';
import { sql } from './db.js';

export interface AuthSessionContext {
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    role: 'admin' | 'member';
    status: 'active' | 'locked' | 'inactive';
    mustChangePassword: boolean;
  };
  session: {
    id: string;
    tokenHash: string;
    userId: string;
    expiresAt: Date;
    lastSeenAt: Date;
  };
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const value = parts.slice(1).join('=').trim();
    if (name) {
      list[name] = decodeURIComponent(value);
    }
  });

  return list;
}

export async function getSession(req: VercelRequest): Promise<AuthSessionContext | null> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['session_token'];
    if (!sessionToken) {
      return null;
    }

    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    // Query session and user status
    const sessions = await sql`
      SELECT s.id as session_id, s.token_hash, s.user_id, s.created_at as session_created_at,
             s.last_seen_at, s.expires_at, s.revoked_at,
             u.id as user_uuid, u.username, u.full_name, u.email,
             u.role, u.status as user_status, u.must_change_password
      FROM auth_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ${tokenHash}
    `;

    if (!sessions || sessions.length === 0) {
      return null;
    }

    const sessionData = sessions[0];
    if (!sessionData) {
      return null;
    }

    // Check revoked
    if (sessionData['revoked_at'] !== null) {
      return null;
    }

    const now = new Date();

    // Check absolute expiration
    const expiresAt = new Date(sessionData['expires_at']);
    if (expiresAt <= now) {
      return null;
    }

    // Check idle timeout (12 hours)
    const lastSeenAt = new Date(sessionData['last_seen_at']);
    const idleLimitMs = 12 * 60 * 60 * 1000;
    if (now.getTime() - lastSeenAt.getTime() > idleLimitMs) {
      return null;
    }

    // Check user active status
    if (sessionData['user_status'] !== 'active') {
      return null;
    }

    // Update last_seen_at using parameter
    await sql`
      UPDATE auth_sessions
      SET last_seen_at = ${now}
      WHERE id = ${sessionData['session_id']}
    `;

    return {
      user: {
        id: sessionData['user_uuid'],
        username: sessionData['username'],
        fullName: sessionData['full_name'],
        email: sessionData['email'],
        role: sessionData['role'] as 'admin' | 'member',
        status: sessionData['user_status'] as 'active' | 'locked' | 'inactive',
        mustChangePassword: sessionData['must_change_password'],
      },
      session: {
        id: sessionData['session_id'],
        tokenHash: sessionData['token_hash'],
        userId: sessionData['user_id'],
        expiresAt: expiresAt,
        lastSeenAt: now,
      },
    };
  } catch (error) {
    console.error('Error in getSession helper:', error);
    return null;
  }
}
