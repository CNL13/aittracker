import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

const updateSelfSchema = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  department: z.string().trim().max(100).nullable().optional(),
  position: z.string().trim().max(100).nullable().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    // 1. Authenticate (any logged-in user)
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = sessionContext.user.id;

    // 2. Validate request body
    const parseResult = updateSelfSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { fullName, email, phone, department, position } = parseResult.data;

    // 3. Fetch current user data
    const users = await sql`
      SELECT id, username, full_name, email, phone_number, department, position
      FROM users
      WHERE id = ${userId}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    const current = users[0]!;

    // 4. Check duplicate email if changed
    if (email && email !== current['email']) {
      const existingEmail = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${userId}
      `;
      if (existingEmail && existingEmail.length > 0) {
        return res.status(400).json({ error: 'Email đã được sử dụng bởi người dùng khác.' });
      }
    }

    // 5. Build new values (keep old values if field not provided)
    const newFullName = fullName !== undefined ? fullName : current['full_name'];
    const newEmail = email !== undefined ? email : current['email'];
    const newPhone = phone !== undefined ? phone : current['phone_number'];
    const newDept = department !== undefined ? department : current['department'];
    const newPos = position !== undefined ? position : current['position'];

    // 6. Update the user
    await sql`
      UPDATE users
      SET full_name = ${newFullName},
          email = ${newEmail},
          phone_number = ${newPhone},
          department = ${newDept},
          position = ${newPos}
      WHERE id = ${userId}
    `;

    return res.status(200).json({
      user: {
        id: userId,
        username: current['username'],
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        department: newDept,
        position: newPos,
      },
    });
  } catch (error: unknown) {
    console.error('Update self error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
