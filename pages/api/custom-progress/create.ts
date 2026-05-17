import { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';
import { normalizeTimeZone, parseClientDateTime } from '../../../lib/customProgressTime';
import { createCustomProgressBar } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '方法不允許' });
  }

  try {
    const { name, startTime, endTime, timeZone } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const creatorTimeZone = normalizeTimeZone(timeZone);

    // 驗證必要參數
    if (!trimmedName || !endTime) {
      return res.status(400).json({ success: false, error: '名稱和結束時間為必填項' });
    }

    if (trimmedName.length > 255) {
      return res.status(400).json({ success: false, error: '名稱最多只能 255 個字元' });
    }

    // 驗證時間格式
    const endDateTime = parseClientDateTime(endTime, creatorTimeZone);
    if (!endDateTime.isValid) {
      return res.status(400).json({ success: false, error: '無效的結束時間格式' });
    }

    if (endDateTime <= DateTime.now().setZone(creatorTimeZone)) {
      return res.status(400).json({ success: false, error: '結束時間必須設定在未來' });
    }
    
    // 設置開始時間，如果沒有提供則使用當前時間
    let startDateTime: DateTime;
    if (startTime) {
      startDateTime = parseClientDateTime(startTime, creatorTimeZone);
      if (!startDateTime.isValid) {
        return res.status(400).json({ success: false, error: '無效的開始時間格式' });
      }
    } else {
      startDateTime = DateTime.now().setZone(creatorTimeZone);
    }

    // 獲取客戶端 IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    // 驗證開始時間早於結束時間
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ success: false, error: '開始時間必須早於結束時間' });
    }

    // 創建自訂進度條
    const result = await createCustomProgressBar(
      trimmedName,
      startDateTime.toUTC().toJSDate(),
      endDateTime.toUTC().toJSDate(),
      creatorTimeZone,
      typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined
    );

    if (result.success) {
      const baseUrl = (process.env.NEXT_PUBLIC_URL || 'https://yearprogres.azndev.com').replace(/\/$/, '');

      return res.status(201).json({
        success: true,
        id: result.id,
        url: `${baseUrl}/${result.id}`
      });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('處理請求時發生錯誤:', error);
    return res.status(500).json({ success: false, error: '內部伺服器錯誤' });
  }
}
