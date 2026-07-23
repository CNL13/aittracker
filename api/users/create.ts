import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUserSchema } from '@ait/validation';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    // 1. Authenticate and check Admin role
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (sessionContext.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const adminId = sessionContext.user.id;

    // 2. Validate request body
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { username, fullName, email, role, department, position } = parseResult.data;
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedDepartment = department?.trim() || null;
    const normalizedPosition = position?.trim() || null;

    // 3. Check duplicate username
    const existingUsername = await sql`
      SELECT id FROM users WHERE normalized_username = ${normalizedUsername}
    `;
    if (existingUsername && existingUsername.length > 0) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại.' });
    }

    // 4. Check duplicate email if provided
    if (email) {
      const existingEmail = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;
      if (existingEmail && existingEmail.length > 0) {
        return res.status(400).json({ error: 'Email đã được sử dụng bởi người dùng khác.' });
      }
    }

    // 5. Generate secure random temporary password
    // Generates a random hex string + a letter + a number to satisfy validation rules (min 8 chars, 1 letter, 1 number)
    const tempPassword = crypto.randomBytes(8).toString('hex') + 'a1A';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let createdUserId = '';

    // 6. Run database inserts in transaction
    await sql.begin(async (sqlTrans) => {
      // Insert user record
      const insertUserResult = await sqlTrans`
        INSERT INTO users (username, normalized_username, full_name, email, role, status, must_change_password, created_by, department, position)
        VALUES (${username.trim()}, ${normalizedUsername}, ${fullName.trim()}, ${email || null}, ${role}, 'active', true, ${adminId}, ${normalizedDepartment}, ${normalizedPosition})
        RETURNING id
      `;

      createdUserId = insertUserResult[0]!.id;

      // Insert credentials record
      await sqlTrans`
        INSERT INTO user_credentials (user_id, password_hash)
        VALUES (${createdUserId}, ${passwordHash})
      `;

      // Log action in audit logs
      const newValues = {
        username: username.trim(),
        normalizedUsername,
        fullName: fullName.trim(),
        email: email || null,
        role,
        status: 'active',
        mustChangePassword: true,
        department: normalizedDepartment,
        position: normalizedPosition,
      };

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, 'user', 'user', ${createdUserId}, 'create_user', ${null}, ${JSON.stringify(newValues)})
      `;
    });

    return res.status(201).json({
      user: {
        id: createdUserId,
        username: username.trim(),
        fullName: fullName.trim(),
        email: email || null,
        role,
        status: 'active',
        mustChangePassword: true,
        department: normalizedDepartment,
        position: normalizedPosition,
      },
      temporaryPassword: tempPassword,
    });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
