import { sql } from './db.js';

export async function sendEmail({
  recipientUserId,
  to,
  subject,
  html,
  type,
  dedupeKey,
  originalNotificationId = null,
}: {
  recipientUserId: string;
  to: string;
  subject: string;
  html: string;
  type: string;
  dedupeKey: string;
  originalNotificationId?: string | null;
}) {
  const hasEmail = !!to;
  const initialStatus = hasEmail ? 'pending' : 'skipped';

  const logRows = await sql`
    INSERT INTO notifications_log (
      recipient_user_id,
      notification_type,
      dedupe_key,
      status,
      original_notification_id
    ) VALUES (
      ${recipientUserId},
      ${type},
      ${dedupeKey},
      ${initialStatus},
      ${originalNotificationId}
    )
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING id
  `;
  const log = logRows[0];
  if (!log) {
    return { status: 'skipped', message: 'Already processed (deduplicated).' };
  }

  if (!hasEmail) {
    return { status: 'skipped', id: log.id, message: 'User has no email address.' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'test') {
      await sql`
        UPDATE notifications_log
        SET status = 'sent',
            provider_message_id = ${`test-msg-${Date.now()}`},
            sent_at = CURRENT_TIMESTAMP
        WHERE id = ${log.id}
      `;
      return { status: 'sent', id: log.id };
    }

    await sql`
      UPDATE notifications_log
      SET status = 'failed',
          error_code = 'RESEND_NOT_CONFIGURED',
          error_message = 'RESEND_API_KEY is not configured'
      WHERE id = ${log.id}
    `;
    return { status: 'failed', id: log.id, error: 'RESEND_API_KEY is not configured' };
  }

  // 3. Send using Resend API via fetch
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AIT Work Tracker <noreply@resend.dev>',
        to,
        subject,
        html,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      await sql`
        UPDATE notifications_log
        SET status = 'sent',
            provider_message_id = ${data.id},
            sent_at = CURRENT_TIMESTAMP
        WHERE id = ${log.id}
      `;
      return { status: 'sent', id: log.id };
    } else {
      const errData = (await res.json()) as any;
      const safeMessage = errData?.message ? String(errData.message).slice(0, 500) : 'Email provider rejected the request';
      await sql`
        UPDATE notifications_log
        SET status = 'failed',
            error_code = ${String(res.status)},
            error_message = ${safeMessage}
        WHERE id = ${log.id}
      `;
      return { status: 'failed', id: log.id, error: safeMessage };
    }
  } catch (err: any) {
    const safeMessage = String(err.message || err || 'Email provider request failed').slice(0, 500);
    await sql`
      UPDATE notifications_log
      SET status = 'failed',
          error_code = 'FETCH_ERROR',
          error_message = ${safeMessage}
      WHERE id = ${log.id}
    `;
    return { status: 'failed', id: log.id, error: safeMessage };
  }
}
