import mysql, { PoolOptions, RowDataPacket } from 'mysql2/promise';
import { randomInt } from 'crypto';
import { DEFAULT_CUSTOM_PROGRESS_TIME_ZONE, normalizeTimeZone } from './customProgressTime';

const DEFAULT_LOCAL_DB_HOST = '192.168.0.10';
const DEFAULT_DB_PORT = 3306;
const DEFAULT_DB_USER = 'YearProgres';
const DEFAULT_DB_PASSWORD = '5YSwPDW7wnBnbGai';
const DEFAULT_DB_NAME = 'YearProgres';

const poolConfig: PoolOptions = {
  host: process.env.DB_HOST || DEFAULT_LOCAL_DB_HOST,
  port: Number(process.env.DB_PORT || DEFAULT_DB_PORT),
  user: process.env.DB_USER || DEFAULT_DB_USER,
  password: process.env.DB_PASSWORD || DEFAULT_DB_PASSWORD,
  database: process.env.DB_NAME || DEFAULT_DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  timezone: 'Z',
};

console.info('資料庫配置:', {
  host: poolConfig.host,
  port: poolConfig.port,
  user: poolConfig.user,
  database: poolConfig.database,
  connectionLimit: poolConfig.connectionLimit,
});

const pool = mysql.createPool(poolConfig);
let initPromise: Promise<boolean> | null = null;

// 初始化資料庫，確保表格存在
export async function initDb() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = ensureSchema();
  const initialized = await initPromise;

  if (!initialized) {
    initPromise = null;
  }

  return initialized;
}

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_progress_bars (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        time_zone VARCHAR(64) NOT NULL DEFAULT '${DEFAULT_CUSTOM_PROGRESS_TIME_ZONE}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by_ip VARCHAR(150)
      )
    `);

    await ensureColumnExists(
      'time_zone',
      `ALTER TABLE custom_progress_bars
       ADD COLUMN time_zone VARCHAR(64) NOT NULL
       DEFAULT '${DEFAULT_CUSTOM_PROGRESS_TIME_ZONE}'
       AFTER end_time`
    );

    return true;
  } catch (error) {
    console.error('資料庫初始化失敗:', error);
    return false;
  }
}

async function ensureColumnExists(columnName: string, alterStatement: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'custom_progress_bars'
       AND COLUMN_NAME = ?`,
    [columnName]
  );

  const count = Number(rows[0]?.count ?? 0);
  if (count === 0) {
    await pool.query(alterStatement);
  }
}

// 創建自訂進度條
export async function createCustomProgressBar(
  name: string,
  startTime: Date,
  endTime: Date,
  timeZone: string,
  ip?: string
) {
  try {
    const initialized = await initDb();
    if (!initialized) {
      return { success: false, error: '資料庫初始化失敗' };
    }

    let processedIp = ip;
    if (ip && ip.length > 140) {
      processedIp = ip.split(',')[0].trim();
      if (processedIp.length > 140) {
        processedIp = processedIp.substring(0, 140);
      }
    }

    const normalizedTimeZone = normalizeTimeZone(timeZone);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = generateId();

      try {
        await pool.execute(
          'INSERT INTO custom_progress_bars (id, name, start_time, end_time, time_zone, created_by_ip) VALUES (?, ?, ?, ?, ?, ?)',
          [id, name, startTime, endTime, normalizedTimeZone, processedIp || null]
        );

        return { id, success: true };
      } catch (error) {
        if (isDuplicateEntry(error)) {
          continue;
        }

        throw error;
      }
    }

    return { success: false, error: '產生進度條 ID 時發生衝突，請再試一次' };
  } catch (error) {
    console.error('創建自訂進度條失敗:', error);
    return { success: false, error: '創建進度條時發生錯誤' };
  }
}

// 獲取自訂進度條信息
export async function getCustomProgressBar(id: string) {
  try {
    const initialized = await initDb();
    if (!initialized) {
      return { success: false, error: '資料庫初始化失敗' };
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, start_time, end_time, time_zone
       FROM custom_progress_bars
       WHERE id = ?`,
      [id]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return { 
        success: true, 
        data: rows[0] 
      };
    }
    
    return { success: false, error: '找不到進度條' };
  } catch (error) {
    console.error('獲取自訂進度條失敗:', error);
    return { success: false, error: '獲取進度條時發生錯誤' };
  }
}

// 生成短ID (8個字符)
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(randomInt(chars.length));
  }
  
  return id;
}

function isDuplicateEntry(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}
