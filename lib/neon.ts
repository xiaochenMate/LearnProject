
import { neon } from '@neondatabase/serverless';

/**
 * 临时解决方案：直接硬编码您的 Neon 连接字符串
 * 针对您的特定数据库地址进行配置
 */
const HARDCODED_URL = "postgresql://neondb_owner:npg_uM5ATQE4pKYR@ep-steep-silence-aeqfo43r-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

const getDatabaseUrl = (): string => {
  // 1. 优先使用硬编码地址（确保当前部署 100% 能连上）
  if (HARDCODED_URL && HARDCODED_URL.includes("neon.tech")) {
    return HARDCODED_URL;
  }

  // 2. 备选方案：尝试从不同环境读取（保留逻辑以兼容未来可能的 CI/CD 修复）
  try {
    // @ts-ignore
    const viteVar = typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATABASE_URL;
    if (viteVar && viteVar.startsWith('postgres')) return viteVar;

    // @ts-ignore
    const processVar = typeof process !== 'undefined' && process.env?.VITE_DATABASE_URL;
    if (processVar && processVar.startsWith('postgres')) return processVar;
  } catch (e) {
    console.error("[Database] 环境访问异常:", e);
  }
  
  return "";
};

const url = getDatabaseUrl();

// 在浏览器控制台打印调试信息 (F12 查看)
if (typeof window !== 'undefined') {
  if (!url) {
    console.warn("⚠️ [Database] 警告：未检测到有效的连接字符串，请检查 lib/neon.ts");
  } else {
    // 只打印前 20 位，防止敏感信息完整泄露到日志
    console.log(`✅ [Database] 链路就绪 (地址前缀: ${url.substring(0, 20)}...)`);
  }
}

export const sql = url ? neon(url) : null;

export default sql;
