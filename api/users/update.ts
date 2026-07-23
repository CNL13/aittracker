import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  role: z.enum(['admin', 'member']).optional(),
  department: z.string().trim().max(100).nullable().optional(),
  position: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
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
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { id, fullName, email, role, department, position, phone } = parseResult.data;

    // 3. Fetch target user
    const users = await sql`
      SELECT id, username, full_name, email, role, status, department, position, phone_number
      FROM users
      WHERE id = ${id}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const targetUser = users[0]!;

    // 4. Last Admin Guard: Check if demoting the last active admin
    const isTargetActiveAdmin = targetUser['role'] === 'admin' && targetUser['status'] === 'active';
    if (role && role !== targetUser['role'] && isTargetActiveAdmin && role === 'member') {
      const activeAdminCountResult = await sql`
        SELECT COUNT(*)::int as count FROM users WHERE role = 'admin' AND status = 'active'
      `;
      const activeAdminCount = activeAdminCountResult[0]?.count || 0;
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: 'Không thể giáng chức quản trị viên hoạt động cuối cùng.',
        });
      }
    }

    // 5. Check duplicate email if it is changed
    if (email && email !== targetUser['email']) {
      const existingEmail = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${id}
      `;
      if (existingEmail && existingEmail.length > 0) {
        return res.status(400).json({ error: 'Email đã được sử dụng bởi người dùng khác.' });
      }
    }

    // 6. Build new values and old values for audit log
    const oldValues = {
      fullName: targetUser['full_name'],
      email: targetUser['email'],
      role: targetUser['role'],
      department: targetUser['department'],
      position: targetUser['position'],
      phone: targetUser['phone_number'],
    };

    const newValues = {
      fullName: fullName !== undefined ? fullName : targetUser['full_name'],
      email: email !== undefined ? email : targetUser['email'],
      role: role !== undefined ? role : targetUser['role'],
      department: department !== undefined ? department : targetUser['department'],
      position: position !== undefined ? position : targetUser['position'],
      phone: phone !== undefined ? phone : targetUser['phone_number'],
    };

    // 7. Update and write audit log in transaction
    await sql.begin(async (sqlTrans) => {
      await sqlTrans`
        UPDATE users
        SET full_name = ${newValues.fullName},
            email = ${newValues.email},
            role = ${newValues.role},
            department = ${newValues.department},
            position = ${newValues.position},
            phone_number = ${newValues.phone}
        WHERE id = ${id}
      `;

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, 'user', 'user', ${id}, 'update_user', ${JSON.stringify(oldValues)}, ${JSON.stringify(newValues)})
      `;
    });

    return res.status(200).json({
      user: {
        id,
        username: targetUser['username'],
        fullName: newValues.fullName,
        email: newValues.email,
        role: newValues.role,
        status: targetUser['status'],
        department: newValues.department,
        position: newValues.position,
        phone: newValues.phone,
      },
    });
  } catch (error: unknown) {
    console.error('Update user error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
