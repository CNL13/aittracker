/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const { projectId, taskId, status: filterStatus } = req.query;

    // Build query - PM sees all for their projects, admin sees all
    let query = sql`
      SELECT 
        pu.id, pu.task_id as "taskId", pu.submitted_by as "submittedBy",
        pu.proposed_percent as "proposedPercent", pu.description, pu.evidence_url as "evidenceUrl",
        pu.status, pu.reviewed_by as "reviewedBy", pu.reviewed_at as "reviewedAt",
        pu.final_percent as "finalPercent", pu.review_note as "reviewNote",
        pu.created_at as "createdAt",
        t.title as "taskTitle", t.percent_complete as "currentPercent",
        u.full_name as "submitterName", u.username as "submitterUsername",
        p.id as "projectId", p.name as "projectName",
        ru.full_name as "reviewerName"
      FROM progress_updates pu
      JOIN tasks t ON t.id = pu.task_id
      JOIN projects p ON p.id = t.project_id
      JOIN users u ON u.id = pu.submitted_by
      LEFT JOIN users ru ON ru.id = pu.reviewed_by
      WHERE 1=1
    `;

    // Filter by project
    if (projectId && typeof projectId === 'string') {
      query = sql`${query} AND t.project_id = ${projectId}`;
    }

    // Filter by task
    if (taskId && typeof taskId === 'string') {
      query = sql`${query} AND pu.task_id = ${taskId}`;
    }

    // Filter by status
    if (filterStatus && typeof filterStatus === 'string') {
      query = sql`${query} AND pu.status = ${filterStatus}`;
    }

    // Permission: non-admin can only see their own submissions or projects they manage
    if (user.role !== 'admin') {
      query = sql`${query} AND (
        pu.submitted_by = ${user.id}
        OR p.manager_id = ${user.id}
      )`;
    }

    query = sql`${query} ORDER BY pu.created_at DESC LIMIT 50`;

    const results = await query;

    return res.status(200).json({ data: results });
  } catch (error: any) {
    console.error('Progress list error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
