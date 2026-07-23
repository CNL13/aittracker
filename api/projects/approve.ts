import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';
import { rejectInvalidMutation } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rejectInvalidMutation(req, res)) return;

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { projectId } = req.body || {};
  if (!projectId || typeof projectId !== 'string') return res.status(400).json({ error: 'projectId is required' });

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  try {
    const projects = await sql`SELECT id, status FROM projects WHERE id = ${projectId}`;
    if (!projects[0]) return res.status(404).json({ error: 'Dự án không tồn tại.' });
    if (projects[0].status !== 'planning') return res.status(400).json({ error: 'Chỉ có thể duyệt dự án đang chờ duyệt.' });

    await sql`UPDATE projects SET status = 'active'::project_status, rejection_reason = NULL, reviewed_by = ${session.user.id}, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${projectId}`;

    await sql`INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action) VALUES (${session.user.id}, 'user', 'project', ${projectId}, 'approve_project')`;

    return res.status(200).json({ success: true, message: 'Dự án đã được duyệt và kích hoạt.' });
  } catch (error) {
    console.error('Approve project error:', error);
    return res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
}
