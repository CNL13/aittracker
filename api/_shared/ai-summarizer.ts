export async function generateAiExecutiveDigest(
  checkins: any[],
  missingUsers: any[] = [],
  absentUsers: any[] = []
): Promise<string> {
  const fallbackSummary = `
    <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <h3 style="color: #6366f1; margin-top: 0; font-size: 15px; text-transform: uppercase;">🤖 BẢN TỔNG HỢP AI TÌNH HÌNH BÁO CÁO NGÀY</h3>
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">Tổng số nhân sự đã nộp báo cáo: <strong>${checkins.length} nhân sự</strong></p>
      <ul style="font-size: 13px; color: #cbd5e1; padding-left: 20px; margin: 0; line-height: 1.6;">
        <li>Các công việc chính trong ngày đã được ghi nhận vào hệ thống.</li>
        <li>Chưa nộp báo cáo (${missingUsers.length}): ${missingUsers.map(u => u.name || u.email).join(', ') || 'Không có'}</li>
        <li>Không đi làm (${absentUsers.length}): ${absentUsers.map(u => u.name || u.email).join(', ') || 'Không có'}</li>
      </ul>
    </div>
  `;

  const prompt = `
Hãy đóng vai một Trợ lý Executive AI chuyên nghiệp. Dưới đây là dữ liệu báo cáo công việc hằng ngày của toàn bộ công ty:

1. DANH SÁCH NHÂN SỰ ĐÃ NỘP BÁO CÁO (${checkins.length}):
${JSON.stringify(checkins, null, 2)}

2. DANH SÁCH NHÂN SỰ CÓ ĐI LÀM NHƯNG CHƯA NỘP BÁO CÁO (${missingUsers.length}):
${JSON.stringify(missingUsers, null, 2)}

3. DANH SÁCH NHÂN SỰ KHÔNG ĐI LÀM / NGHỈ PHÉP (${absentUsers.length}):
${JSON.stringify(absentUsers, null, 2)}

Hãy viết một BẢN TỔNG HỢP BÁO CÁO CÔNG TY dạng HTML sắc nét, trình bày bằng Tiếng Việt (chỉ dùng thẻ <div>, <h3>, <ul>, <li>, <strong>, <p>, không kèm markdown backticks):
1. 📌 Điểm tin nổi bật (Các nhiệm vụ chính đã hoàn thành).
2. 🏆 Nhân sự ghi nhận làm việc xuất sắc / vượt tiến độ.
3. 🚨 Các vướng mắc, khó khăn khẩn cấp (Blockers) cần Admin / Sếp hỗ trợ xử lý ngay.
4. ❌ Chưa nộp báo cáo: Liệt kê chi tiết tên nhân sự + phòng ban có đi làm nhưng CHƯA nộp báo cáo.
5. 🚫 Không đi làm: Liệt kê chi tiết tên nhân sự + lý do/phòng ban nghỉ phép/không đi làm.
`;

  // 1. Try NVIDIA NIM API if key is present
  if (process.env.NVIDIA_API_KEY) {
    try {
      const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1024
        })
      });
      if (nvidiaRes.ok) {
        const data = await nvidiaRes.json() as any;
        let text = data.choices?.[0]?.message?.content;
        if (text) {
          text = text.replace(/```html/gi, '').replace(/```/g, '').trim();
          return `
            <div style="background-color: #0f172a; border: 1px solid #10b981; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <h3 style="color: #34d399; margin-top: 0; font-size: 15px; text-transform: uppercase; border-b: 1px solid #334155; padding-bottom: 8px;">🤖 BẢN TỔNG HỢP AI TÌNH HÌNH BÁO CÁO TOÀN CÔNG TY (NVIDIA LLM)</h3>
              <div style="font-size: 13px; color: #e2e8f0; line-height: 1.6;">
                ${text}
              </div>
            </div>
          `;
        }
      }
    } catch (err) {
      console.error('NVIDIA NIM API failed, trying Gemini...', err);
    }
  }

  // 2. Try Gemini API keys
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    'AIzaSyCROK_WVrFw70IWT930zcpzIdBd8tfdknE',
    'AIzaSC6toXSWB8nOA08UyBQt61NclDagYkdxXc',
    'AIzaSyAgYonXZ8bg6ZR5sWJtIyyre96cRGVYVds'
  ].filter(Boolean);

  for (const key of geminiKeys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/```html/gi, '').replace(/```/g, '').trim();
          return `
            <div style="background-color: #0f172a; border: 1px solid #4f46e5; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <h3 style="color: #818cf8; margin-top: 0; font-size: 15px; text-transform: uppercase; border-b: 1px solid #334155; padding-bottom: 8px;">🤖 BẢN TỔNG HỢP AI TÌNH HÌNH BÁO CÁO TOÀN CÔNG TY (Gemini 1.5 Pro)</h3>
              <div style="font-size: 13px; color: #e2e8f0; line-height: 1.6;">
                ${text}
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      console.error('Gemini Key attempt failed:', e);
    }
  }

  return fallbackSummary;
}
