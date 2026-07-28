
import { neon } from '@neondatabase/serverless';

const getDatabaseUrl = (): string => {
  try {
    const viteVar = import.meta.env?.VITE_NEON_DATABASE_URL;
    if (viteVar && viteVar.startsWith('postgres')) {
      return viteVar;
    }
  } catch (e) {
    console.error("[Database] 环境访问异常:", e);
  }
  
  return "";
};

const url = getDatabaseUrl();

// 在浏览器控制台打印调试信息 (F12 查看)
if (typeof window !== 'undefined') {
  if (!url) {
    console.info("[Database] 未配置前端只读数据库连接，相关模块会使用本地数据降级。");
  } else {
    console.info("[Database] 前端只读数据链路就绪。");
  }
}

export const sql = url ? neon(url) : null;

export default sql;
