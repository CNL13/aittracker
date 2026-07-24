import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';
import { currentDateInBusinessTz, rejectInvalidMutation } from '../_shared/http.js';
import { submitCheckInSchema } from '@ait/validation';
import { sendLateCheckInEmailNotification } from '../_shared/email.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const validationResult = submitCheckInSchema.safeParse(req.body);
  if (!validationResult.success) {
    const firstMsg = validationResult.error.errors[0]?.message || 'Invalid payload';
    return res.status(400).json({ error: firstMsg, details: validationResult.error.errors });
  }
  const data = validationResult.data;
  const items = data.noActivity ? [] : data.items;

  const todayStr = currentDateInBusinessTz();
  const targetDate = data.date || todayStr;
  const isAdminOldDateEdit = targetDate !== todayStr;

  if (isAdminOldDateEdit && session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can edit past check-ins' });
  }

  if (isAdminOldDateEdit && !data.adminEditReason?.trim()) {
    return res.status(400).json({ error: 'Admin edit reason is required for past check-ins' });
  }

  const blockerTooShort = items.find((item: any) => {
    const details = item.blockerDetails?.trim();
    return details && details.length < 10;
  });
  if (blockerTooShort) {
    return res.status(400).json({ error: 'Blocker details must be at least 10 characters' });
  }

  // Submission window rules
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeInMinutes = currentHour * 60 + currentMinute;
  const isLateSubmission = timeInMinutes > 21 * 60 + 30 || targetDate < todayStr;
  
  if (timeInMinutes < 8 * 60) {
    return res.status(400).json({ error: 'Báo cáo chỉ được nộp từ 08:00 đến 21:30.' });
  }

  try {
    await sql.begin(async (tx: any) => {
      const uniqueTaskIds = Array.from(new Set(items.map((item: any) => item.taskId)));
      const eligibleRows = uniqueTaskIds.length > 0 ? await tx`
        SELECT t.id, t.status, t.percent_complete, tm.assignment_role
        FROM tasks t
        JOIN task_members tm ON tm.task_id = t.id
        JOIN projects p ON p.id = t.project_id
        WHERE t.id = ANY(${uniqueTaskIds}::uuid[])
          AND tm.user_id = ${session.user.id}
          AND tm.removed_at IS NULL
          AND tm.report_required = TRUE
          AND p.status = 'active'
          AND p.archived_at IS NULL
          AND t.status != 'done'
          AND t.archived_at IS NULL
          AND (t.start_date IS NULL OR t.start_date <= ${targetDate})
      ` : [];

      const normalizedEligibleRows = eligibleRows.map((row: any) => (
        row.id ? row : { ...row, id: uniqueTaskIds.length === 1 ? uniqueTaskIds[0] : undefined }
      ));
      const eligibleByTaskId = new Map(normalizedEligibleRows.map((row: any) => [row.id, row]));
      const invalidTaskId = uniqueTaskIds.find((taskId) => !eligibleByTaskId.has(taskId));
      if (invalidTaskId) {
        throw Object.assign(new Error('Task is not available for this check-in'), { statusCode: 403 });
      }

      const existing = await tx`
        SELECT id
        FROM daily_checkins
        WHERE user_id = ${session.user.id}
          AND checkin_date = ${targetDate}
      `;
      const isEditing = existing.length > 0;

      const hasContent = items.length > 0 || !!(data.summaryToday && data.summaryToday.trim().length > 0);
      const noActivity = !hasContent && !!data.noActivity;
      const isAdminEdit = session.user.role === 'admin' && (isEditing || isAdminOldDateEdit);
      const upsertRes = await tx`
        INSERT INTO daily_checkins (
          user_id, checkin_date, summary_today, no_activity, no_activity_reason,
          general_difficulties, help_needed, plan_tomorrow, total_time_spent_hours,
          edited_by_admin_at, admin_edit_reason
        ) VALUES (
          ${session.user.id}, ${targetDate}, ${data.summaryToday || null},
          ${noActivity}, ${noActivity ? data.noActivityReason || null : null},
          ${data.generalDifficulties || null}, ${data.helpNeeded || null},
          ${data.planTomorrow || null}, ${data.totalTimeSpentHours || null},
          ${isAdminEdit ? new Date() : null},
          ${isAdminEdit ? data.adminEditReason || 'Admin edit' : null}
        )
        ON CONFLICT (user_id, checkin_date) DO UPDATE
        SET
          summary_today = EXCLUDED.summary_today,
          no_activity = EXCLUDED.no_activity,
          no_activity_reason = EXCLUDED.no_activity_reason,
          general_difficulties = EXCLUDED.general_difficulties,
          help_needed = EXCLUDED.help_needed,
          plan_tomorrow = EXCLUDED.plan_tomorrow,
          total_time_spent_hours = EXCLUDED.total_time_spent_hours,
          edited_by_admin_at = EXCLUDED.edited_by_admin_at,
          admin_edit_reason = EXCLUDED.admin_edit_reason
        RETURNING id
      `;
      const checkinId = upsertRes[0]?.id || existing[0]?.id;
      if (!checkinId) {
        throw new Error('Failed to persist daily check-in');
      }

      if (isLateSubmission) {
         // Run async, don't wait to block response
         sendLateCheckInEmailNotification(session.user, data).catch(console.error);
      }

      await tx`
        UPDATE daily_checkin_items
        SET removed_at = CURRENT_TIMESTAMP
        WHERE checkin_id = ${checkinId}
          AND removed_at IS NULL
      `;

      // Insert items
      if (items.length > 0) {
        for (const item of items) {
          const participant = eligibleByTaskId.get(item.taskId);
          const proposedPercent = item.percentCompleteProposed ?? item.memberPercentComplete ?? null;
          const proposedStatus = item.proposedTaskStatus || (proposedPercent === 100 ? 'done' : null);
          const storedPercent = proposedStatus === 'done' ? 100 : proposedPercent;

          const itemRes = await tx`
            INSERT INTO daily_checkin_items (
              checkin_id, task_id, progress_note, member_percent_complete,
              proposed_task_percent, proposed_task_status, time_spent_hours, help_needed, removed_at
            ) VALUES (
              ${checkinId}, ${item.taskId}, ${item.workDone}, ${item.memberPercentComplete ?? storedPercent},
              ${storedPercent}, ${proposedStatus}, ${item.timeSpentHours ?? null}, ${item.helpNeeded || null}, NULL
            )
            ON CONFLICT (checkin_id, task_id) DO UPDATE
            SET
              progress_note = EXCLUDED.progress_note,
              member_percent_complete = EXCLUDED.member_percent_complete,
              proposed_task_percent = EXCLUDED.proposed_task_percent,
              proposed_task_status = EXCLUDED.proposed_task_status,
              time_spent_hours = EXCLUDED.time_spent_hours,
              help_needed = EXCLUDED.help_needed,
              removed_at = NULL
            RETURNING id
          `;
          const itemId = itemRes[0]!.id;

          const isOwner = participant?.assignment_role === 'owner';

          if ((isOwner || session.user.role === 'admin') && (storedPercent !== null || proposedStatus)) {
            if (proposedStatus === 'done') {
              await tx`
                UPDATE tasks
                SET percent_complete = 100, status = 'done', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${item.taskId} AND status != 'done'
              `;
            } else {
              // Only update percent and potentially move status to in_progress if it was todo
              await tx`
                UPDATE tasks
                SET percent_complete = COALESCE(${storedPercent}, percent_complete),
                    status = COALESCE(
                      ${proposedStatus}::task_workflow_status,
                      CASE WHEN status = 'todo' AND COALESCE(${storedPercent}, 0) > 0 THEN 'in_progress'::task_workflow_status ELSE status END
                    ),
                    completed_at = CASE WHEN ${proposedStatus} IS NOT NULL AND ${proposedStatus} != 'done' THEN NULL ELSE completed_at END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ${item.taskId}
              `;
            }
          }

          // Blocker creation
          if (item.blockerDetails?.trim()) {
            const existingOpenBlockers = await tx`
              SELECT id
              FROM task_blockers
              WHERE task_id = ${item.taskId}
                AND reported_by = ${session.user.id}
                AND status = 'open'
            `;
            if (existingOpenBlockers.length > 0) {
              continue;
            }

            await tx`
              INSERT INTO task_blockers (
                task_id, reported_by, checkin_item_id, description, status
              ) VALUES (
                ${item.taskId}, ${session.user.id}, ${itemId}, ${item.blockerDetails.trim()}, 'open'
              )
            `;
          }
        }
      }

      // Audit logs
      await tx`
        INSERT INTO activity_logs (
          actor_id, actor_type, entity_type, entity_id, action
        ) VALUES (
          ${session.user.id}, 'user', 'daily_checkins', ${checkinId}, ${isEditing ? 'update' : 'create'}
        )
      `;
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if ((error as any)?.statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    console.error('Error submitting check-in:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
