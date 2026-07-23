import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { sql } from '../_shared/db.js';
import { parseCookies } from '../_shared/auth.js';
import { rejectInvalidMutation } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for logout
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['session_token'];

    if (sessionToken) {
      const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
      const now = new Date();

      // Update revoked_at using parameters
      await sql`
        UPDATE auth_sessions
        SET revoked_at = ${now}
        WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
      `;
    }

    // Overwrite the cookie to remove it
    res.setHeader(
      'Set-Cookie',
      'session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
