import { NextApiRequest, NextApiResponse } from 'next';
import { DateTime } from 'luxon';
import { normalizeTimeZone, parseClientDateTime } from '../../../lib/customProgressTime';
import { createCustomProgressBar } from '../../../lib/db';
import {
  consumeRateLimit,
  getClientIp,
  hasControlCharacters,
  isAllowedOrigin,
  isJsonRequest,
} from '../../../lib/security';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8kb',
    },
  },
};

const CREATE_LIMIT = 20;
const CREATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_DURATION_DAYS = 36600;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '方法不允許' });
  }

  if (!isJsonRequest(req)) {
    return res.status(415).json({ success: false, error: '只接受 JSON 請求' });
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ success: false, error: '來源不允許' });
  }

  const ip = getClientIp(req);
  const rateLimit = consumeRateLimit(`custom-progress:create:${ip}`, CREATE_LIMIT, CREATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({ success: false, error: '請稍後再試' });
  }

  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, error: '無效的請求內容' });
    }

    const { name, startTime, endTime, timeZone } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const rawTimeZone = typeof timeZone === 'string' ? timeZone.trim() : '';
    const creatorTimeZone = normalizeTimeZone(rawTimeZone);

    // 驗證必要參數
    if (!trimmedName || !endTime) {
      return res.status(400).json({ success: false, error: '名稱和結束時間為必填項' });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ success: false, error: '名稱最多只能 100 個字元' });
    }

    if (hasControlCharacters(trimmedName)) {
      return res.status(400).json({ success: false, error: '名稱含有不允許的字元' });
    }

    if (!rawTimeZone || creatorTimeZone !== rawTimeZone) {
      return res.status(400).json({ success: false, error: '無效的時區' });
    }

    if (typeof endTime !== 'string' || endTime.length > 40) {
      return res.status(400).json({ success: false, error: '無效的結束時間格式' });
    }

    if (startTime !== undefined && (typeof startTime !== 'string' || startTime.length > 40)) {
      return res.status(400).json({ success: false, error: '無效的開始時間格式' });
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
    if (typeof startTime === 'string' && startTime) {
      startDateTime = parseClientDateTime(startTime, creatorTimeZone);
      if (!startDateTime.isValid) {
        return res.status(400).json({ success: false, error: '無效的開始時間格式' });
      }
    } else {
      startDateTime = DateTime.now().setZone(creatorTimeZone);
    }

    // 驗證開始時間早於結束時間
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ success: false, error: '開始時間必須早於結束時間' });
    }

    if (endDateTime.diff(startDateTime, 'days').days > MAX_DURATION_DAYS) {
      return res.status(400).json({ success: false, error: '時間範圍過長' });
    }

    // 創建自訂進度條
    const result = await createCustomProgressBar(
      trimmedName,
      startDateTime.toUTC().toJSDate(),
      endDateTime.toUTC().toJSDate(),
      creatorTimeZone,
      ip
    );

    if (result.success) {
      const baseUrl = (process.env.NEXT_PUBLIC_URL || 'https://yearprogres.azndev.com').replace(/\/$/, '');

      return res.status(201).json({
        success: true,
        id: result.id,
        url: `${baseUrl}/${result.id}`
      });
    }

    return res.status(500).json({ success: false, error: '創建進度條時發生錯誤' });
  } catch (error) {
    console.error('處理請求時發生錯誤:', error);
    return res.status(500).json({ success: false, error: '內部伺服器錯誤' });
  }
}
