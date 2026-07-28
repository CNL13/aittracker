import { sql } from './db.js';

export async function sendLateCheckInEmailNotification(user: any, checkin: any) {
  const adminUsers = await sql`SELECT id, email, full_name FROM users WHERE role = 'admin' AND is_active = true LIMIT 1`;
  const adminEmail = adminUsers[0]?.email || process.env.ADMIN_EMAIL || user.email || 'admin@ait.vn';
  const adminId = adminUsers[0]?.id || user.id;

  const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const nowDate = new Date().toLocaleDateString('vi-VN');

  const html = `
    <div style="background-color: #0f172a; color: #f8fafc; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #334155;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-b: 1px solid #334155; padding-bottom: 12px; margin-bottom: 20px;">
        <span style="font-weight: 800; font-size: 16px; color: #6366f1;">⚡ AIT WORK TRACKER</span>
        <span style="background-color: #ef444420; color: #f87171; border: 1px solid #ef444440; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
          ⚠️ NỘP MUỘN (LÚC ${nowTime})
        </span>
      </div>

      <h2 style="font-size: 18px; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Cảnh báo: Nhân sự nộp Báo cáo muộn</h2>
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">
        Nhân sự <strong style="color: #cbd5e1;">${user.fullName || user.username}</strong> đã gửi báo cáo hằng ngày vào thời gian trễ hạn quy định.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #64748b; width: 140px;">👤 Nhân sự:</td>
          <td style="padding: 8px 0; color: #f1f5f9; font-weight: 600;">${user.fullName || user.username} (${user.department || 'Nhân sự'})</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #64748b;">📅 Ngày báo cáo:</td>
          <td style="padding: 8px 0; color: #f1f5f9;">${checkin.checkinDate || nowDate}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #64748b;">⏰ Giờ nộp thực tế:</td>
          <td style="padding: 8px 0; color: #f87171; font-weight: 700;">${nowTime} (${nowDate})</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #64748b;">📝 Tóm tắt công việc:</td>
          <td style="padding: 8px 0; color: #f1f5f9;">${checkin.summaryToday || (checkin.noActivity ? '💤 Không phát sinh công việc' : 'Đã nộp nội dung công việc')}</td>
        </tr>
        ${checkin.generalDifficulties ? `
        <tr>
          <td style="padding: 8px 0; color: #f87171;">🚨 Vướng mắc:</td>
          <td style="padding: 8px 0; color: #fca5a5;">${checkin.generalDifficulties}</td>
        </tr>` : ''}
      </table>

      <div style="text-align: center; margin-top: 24px; pt: 16px; border-top: 1px solid #1e293b;">
        <a href="https://aittracker-web.vercel.app/#/admin-reports" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700;">
          🔍 Xem chi tiết trên AIT Tracker
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    recipientUserId: adminId,
    to: adminEmail,
    subject: `⚠️ [AIT Tracker] Báo cáo nộp muộn: ${user.fullName || user.username}`,
    html,
    type: 'late_checkin',
    dedupeKey: `late_checkin_${user.id}_${new Date().toISOString().split('T')[0]}`,
  });
}

export async function sendAiExecutiveDigestEmail(summaryHtml: string) {
  const adminUsers = await sql`SELECT id, email FROM users WHERE role = 'admin' AND is_active = true LIMIT 1`;
  const adminEmail = adminUsers[0]?.email || process.env.ADMIN_EMAIL || 'admin@ait.vn';
  const adminId = adminUsers[0]?.id || 'admin-digest';

  const html = `
    <div style="background-color: #0f172a; color: #f8fafc; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 16px; max-width: 650px; margin: 0 auto; border: 1px solid #334155;">
      <div style="border-b: 1px solid #334155; padding-bottom: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 800; font-size: 16px; color: #6366f1;">⚡ AIT WORK TRACKER - EXECUTIVE AI DIGEST</span>
        <span style="font-size: 11px; color: #94a3b8;">${new Date().toLocaleDateString('vi-VN')}</span>
      </div>

      ${summaryHtml}

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://aittracker-web.vercel.app/#/admin-reports" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700;">
          📊 Mở Dashboard Quản lý Báo cáo
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    recipientUserId: adminId,
    to: adminEmail,
    subject: `🤖 [AIT Tracker] Bản tổng hợp AI Báo cáo toàn công ty ngày ${new Date().toLocaleDateString('vi-VN')}`,
    html,
    type: 'ai_digest',
    dedupeKey: `ai_digest_${new Date().toISOString().split('T')[0]}`,
  });
}

export async function sendEmail({
  recipientUserId,
  to,
  subject,
  html,
  type,
  dedupeKey,
  originalNotificationId = null,
  trustRecipientUserId = false,
}: {
  recipientUserId: string;
  to: string | string[];
  subject: string;
  html: string;
  type: string;
  dedupeKey: string;
  originalNotificationId?: string | null;
  trustRecipientUserId?: boolean;
}) {
  const hasEmail = Array.isArray(to) ? to.length > 0 : !!to;
  const initialStatus = hasEmail ? 'pending' : 'skipped';

  const isUuid = typeof recipientUserId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientUserId);
  
  let validUserId: string | null = null;
  if (trustRecipientUserId && isUuid) {
    validUserId = recipientUserId;
  } else if (isUuid) {
    const check = await sql`SELECT id FROM users WHERE id = ${recipientUserId}::uuid LIMIT 1`;
    if (check[0]?.id) validUserId = check[0].id;
  }
  if (!validUserId) {
    const defaultUser = await sql`SELECT id FROM users LIMIT 1`;
    validUserId = defaultUser[0]?.id || null;
  }

  if (!validUserId) {
    return { status: 'skipped', message: 'No valid user found for notification log' };
  }

  const logRows = await sql`
    INSERT INTO notifications_log (
      recipient_user_id,
      notification_type,
      dedupe_key,
      status,
      original_notification_id
    ) VALUES (
      ${validUserId},
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

  const recipientList = Array.isArray(to) ? to : to.split(',').map(s => s.trim());

  // 3. Send using Resend API via fetch
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AIT Work Tracker <onboarding@resend.dev>',
        to: recipientList,
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
