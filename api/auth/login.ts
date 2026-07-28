import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loginSchema } from '@ait/validation';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for login
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { username, password } = parseResult.data;
    const normalizedUsername = username.trim().toLowerCase();

    // Get IP and hash it
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    const now = new Date();

    // Rate-limiting check: max 10 attempts in 15 minutes
    const rateLimitWindow = new Date(Date.now() - 15 * 60 * 1000);
    const attemptsCount = await sql`
      SELECT COUNT(*)::int as count
      FROM auth_login_attempts
      WHERE (normalized_username = ${normalizedUsername} OR ip_hash = ${ipHash})
        AND attempted_at > ${rateLimitWindow}
        AND success = false
    `;

    if (attemptsCount[0] && attemptsCount[0].count >= 10) {
      return res.status(429).json({
        error: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.',
      });
    }

    // Lookup user and credentials
    const users = await sql`
      SELECT u.id, u.username, u.normalized_username, u.full_name, u.email, u.role, u.status, u.must_change_password,
             uc.password_hash, uc.failed_login_count, uc.locked_until
      FROM users u
      LEFT JOIN user_credentials uc ON u.id = uc.user_id
      WHERE u.normalized_username = ${normalizedUsername}
    `;

    if (!users || users.length === 0) {
      // Record login attempt (failed due to non-existent user)
      await sql`
        INSERT INTO auth_login_attempts (normalized_username, ip_hash, success, attempted_at, failure_reason)
        VALUES (${normalizedUsername}, ${ipHash}, ${false}, ${now}, ${'User not found'})
      `;

      return res.status(401).json({
        error: 'Tên đăng nhập hoặc mật khẩu không chính xác',
      });
    }

    const user = users[0]!;

    // Check account status: locked or inactive, or locked_until in the future
    const lockedUntil = user['locked_until'] ? new Date(user['locked_until']) : null;
    if (user['status'] === 'locked' || user['status'] === 'inactive' || (lockedUntil && lockedUntil > now)) {
      const reason = user['status'] === 'inactive' ? 'Account inactive' : 'Account locked';
      await sql`
        INSERT INTO auth_login_attempts (normalized_username, ip_hash, success, attempted_at, failure_reason)
        VALUES (${normalizedUsername}, ${ipHash}, ${false}, ${now}, ${reason})
      `;

      return res.status(401).json({
        error: 'Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.',
      });
    }

    // Verify password
    const passwordHash = user['password_hash'] || '';
    const passwordMatch = await bcrypt.compare(password, passwordHash);

    if (!passwordMatch) {
      const newFailedCount = (user['failed_login_count'] || 0) + 1;
      let newLockedUntil = user['locked_until'];
      if (newFailedCount >= 5) {
        newLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 minutes
      }

      await sql`
        UPDATE user_credentials
        SET failed_login_count = ${newFailedCount},
            last_failed_login_at = ${now},
            locked_until = ${newLockedUntil}
        WHERE user_id = ${user['id']}
      `;

      await sql`
        INSERT INTO auth_login_attempts (normalized_username, ip_hash, success, attempted_at, failure_reason)
        VALUES (${normalizedUsername}, ${ipHash}, ${false}, ${now}, ${'Invalid password'})
      `;

      return res.status(401).json({
        error: 'Tên đăng nhập hoặc mật khẩu không chính xác',
      });
    }

    // Login successful
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // absolute 7 days

    // Save session in DB
    await sql`
      INSERT INTO auth_sessions (token_hash, user_id, expires_at, last_seen_at, user_agent, ip_hash)
      VALUES (${tokenHash}, ${user['id']}, ${expiresAt}, ${now}, ${req.headers['user-agent'] || null}, ${ipHash})
    `;

    // Reset failed login count and update last login
    await sql`
      UPDATE user_credentials
      SET failed_login_count = ${0},
          locked_until = ${null}
      WHERE user_id = ${user['id']}
    `;

    await sql`
      UPDATE users
      SET last_login_at = ${now}
      WHERE id = ${user['id']}
    `;

    // Record login attempt (successful)
    await sql`
      INSERT INTO auth_login_attempts (normalized_username, ip_hash, success, attempted_at)
      VALUES (${normalizedUsername}, ${ipHash}, ${true}, ${now})
    `;

    // Set cookie
    const isHttps =
      req.headers['x-forwarded-proto'] === 'https' ||
      String(req.headers.host || '').startsWith('https://') ||
      process.env.NODE_ENV === 'production';
    const cookieParts = [
      `session_token=${sessionToken}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`,
    ];
    if (isHttps) {
      cookieParts.push('Secure');
    }
    res.setHeader('Set-Cookie', cookieParts.join('; '));

    return res.status(200).json({
      user: {
        id: user['id'],
        username: user['username'],
        fullName: user['full_name'],
        role: user['role'],
        status: user['status'],
        mustChangePassword: user['must_change_password'],
        lastLoginAt: now.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
