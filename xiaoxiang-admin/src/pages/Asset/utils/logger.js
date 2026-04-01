// src/utils/logger.js
/**
 * 前端开发日志工具
 * 
 * 使用方法：
 * import { logger } from '@/utils/logger';
 * logger.api('请求快照', '/api/assets/snapshot', payload, response);
 * logger.error('保存失败', error);
 * logger.success('操作成功', data);
 */

// 是否开启详细日志
// 开发环境默认开启，生产环境可通过 localStorage.setItem('DEBUG_LOG', 'true') 强制开启
const isDevelopment = process.env.NODE_ENV !== 'production';
const forceDebug = typeof window !== 'undefined' && localStorage.getItem('DEBUG_LOG') === 'true';
const ENABLE_LOG = isDevelopment || forceDebug;

// 同步订单状态专用日志开关（始终开启，方便调试）
const ENABLE_SYNC_LOG = true;

console.log('%c[Logger] 日志系统初始化', 'color: #1890ff; font-weight: bold;', {
  isDevelopment,
  forceDebug,
  ENABLE_LOG,
  ENABLE_SYNC_LOG,
});

// 日志样式配置
const STYLES = {
  title: 'color: #fff; background: #1890ff; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  success: 'color: #fff; background: #52c41a; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  error: 'color: #fff; background: #ff4d4f; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  warning: 'color: #fff; background: #faad14; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  info: 'color: #fff; background: #722ed1; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  api: 'color: #fff; background: #13c2c2; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  data: 'color: #1890ff; background: #e6f7ff; padding: 2px 6px; border-radius: 3px;',
  time: 'color: #666; font-size: 11px;',
};

// 获取当前时间
const getTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

// 分隔线
const divider = () => console.log('%c' + '═'.repeat(60), 'color: #ddd;');

/**
 * 主日志对象
 */
export const logger = {
  // ==================== 基础日志 ====================
  
  log(title, data) {
    if (!ENABLE_LOG) return;
    console.log(`%c[LOG] ${title}`, STYLES.title, data);
  },

  success(title, data) {
    if (!ENABLE_LOG) return;
    console.log(`%c[SUCCESS] ${title}`, STYLES.success, data);
  },

  error(title, error) {
    if (!ENABLE_LOG) return;
    console.group(`%c[ERROR] ${title}`, STYLES.error);
    console.error('错误对象:', error);
    if (error?.message) console.error('错误信息:', error.message);
    if (error?.stack) console.error('错误堆栈:', error.stack);
    console.groupEnd();
  },

  warning(title, data) {
    if (!ENABLE_LOG) return;
    console.log(`%c[WARNING] ${title}`, STYLES.warning, data);
  },

  info(title, data) {
    if (!ENABLE_LOG) return;
    console.log(`%c[INFO] ${title}`, STYLES.info, data);
  },

  // ==================== API 请求日志 ====================
  
  /**
   * 记录 API 请求
   * @param {string} action - 操作描述
   * @param {string} url - 请求地址
   * @param {object} payload - 请求参数
   */
  request(action, url, payload) {
    if (!ENABLE_LOG) return;
    divider();
    console.log(`%c[REQUEST] ${action}`, STYLES.api, `⏰ ${getTime()}`);
    console.log('%c请求地址:', STYLES.data, url);
    if (payload) {
      console.log('%c请求参数:', STYLES.data);
      console.table(payload);
    }
    divider();
  },

  /**
   * 记录 API 响应
   * @param {string} action - 操作描述
   * @param {object} response - 响应数据
   * @param {number} duration - 耗时(ms)
   */
  response(action, response, duration = 0) {
    if (!ENABLE_LOG) return;
    const isSuccess = response?.success !== false;
    const style = isSuccess ? STYLES.success : STYLES.error;
    
    divider();
    console.log(`%c[RESPONSE] ${action}`, style, `⏰ ${getTime()} ${duration ? `(${duration}ms)` : ''}`);
    console.log('%c响应数据:', STYLES.data, response);
    divider();
  },

  /**
   * 完整的 API 日志（请求+响应）
   * @param {string} action - 操作描述
   * @param {string} url - 请求地址
   * @param {object} payload - 请求参数
   * @param {object} response - 响应数据
   * @param {number} duration - 耗时(ms)
   */
  api(action, url, payload, response, duration = 0) {
    if (!ENABLE_LOG) return;
    const isSuccess = response?.success !== false;
    const style = isSuccess ? STYLES.success : STYLES.error;
    
    divider();
    console.log(`%c[API] ${action}`, style, `⏰ ${getTime()} ${duration ? `(${duration}ms)` : ''}`);
    console.log('%c请求地址:', STYLES.data, url);
    
    if (payload) {
      console.log('%c请求参数:', STYLES.data);
      console.log(JSON.stringify(payload, null, 2));
    }
    
    console.log('%c响应结果:', STYLES.data);
    console.log(JSON.stringify(response, null, 2));
    divider();
  },

  // ==================== 数据日志 ====================
  
  /**
   * 记录数据变化
   * @param {string} label - 数据标签
   * @param {any} data - 数据内容
   */
  data(label, data) {
    if (!ENABLE_LOG) return;
    console.group(`%c[DATA] ${label}`, STYLES.title);
    console.log('数据类型:', typeof data);
    console.log('数据内容:', data);
    if (Array.isArray(data)) {
      console.log('数组长度:', data.length);
    }
    console.groupEnd();
  },

  /**
   * 记录数据对比
   * @param {string} label - 标签
   * @param {any} before - 变化前
   * @param {any} after - 变化后
   */
  diff(label, before, after) {
    if (!ENABLE_LOG) return;
    console.group(`%c[DIFF] ${label}`, STYLES.info);
    console.log('变化前:', before);
    console.log('变化后:', after);
    console.groupEnd();
  },

  // ==================== 流程日志 ====================
  
  /**
   * 开始一个流程
   * @param {string} name - 流程名称
   */
  startFlow(name) {
    if (!ENABLE_LOG) return;
    console.group(`%c[FLOW START] ${name}`, STYLES.title, `⏰ ${getTime()}`);
  },

  /**
   * 结束当前流程
   * @param {string} name - 流程名称
   * @param {boolean} success - 是否成功
   */
  endFlow(name, success = true) {
    if (!ENABLE_LOG) return;
    const style = success ? STYLES.success : STYLES.error;
    console.log(`%c[FLOW END] ${name}`, style, `⏰ ${getTime()}`);
    console.groupEnd();
  },

  /**
   * 流程步骤
   * @param {string} step - 步骤名称
   * @param {any} data - 步骤数据
   */
  step(step, data) {
    if (!ENABLE_LOG) return;
    console.log(`%c[STEP] ${step}`, STYLES.info, data);
  },

  // ==================== 调试工具 ====================
  
  /**
   * 打印对象结构
   * @param {string} label - 标签
   * @param {object} obj - 对象
   */
  structure(label, obj) {
    if (!ENABLE_LOG) return;
    console.group(`%c[STRUCTURE] ${label}`, STYLES.title);
    Object.keys(obj || {}).forEach(key => {
      const value = obj[key];
      const type = Array.isArray(value) ? `Array[${value.length}]` : typeof value;
      console.log(`  ${key}: ${type}`, value);
    });
    console.groupEnd();
  },

  /**
   * 表格形式展示数据
   * @param {string} label - 标签
   * @param {array} data - 数组数据
   */
  table(label, data) {
    if (!ENABLE_LOG) return;
    console.log(`%c[TABLE] ${label}`, STYLES.title);
    if (Array.isArray(data)) {
      console.table(data);
    } else {
      console.log('不是数组:', data);
    }
  },

  /**
   * 计时器开始
   * @param {string} label - 标签
   */
  time(label) {
    if (!ENABLE_LOG) return;
    console.time(label);
  },

  /**
   * 计时器结束
   * @param {string} label - 标签
   */
  timeEnd(label) {
    if (!ENABLE_LOG) return;
    console.timeEnd(label);
  },

  // ==================== ✅ 同步订单状态专用日志（始终开启） ====================
  
  /**
   * 同步日志 - 始终输出，不受 ENABLE_LOG 影响
   */
  sync: {
    start(title) {
      console.log(
        '%c' + '═'.repeat(60),
        'color: #fa8c16;'
      );
      console.log(
        '%c🔄 [SYNC START] ' + title,
        'color: #fff; background: #fa8c16; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;',
        '⏰ ' + getTime()
      );
    },

    end(title, success = true) {
      const style = success 
        ? 'color: #fff; background: #52c41a; padding: 4px 12px; border-radius: 4px; font-weight: bold;'
        : 'color: #fff; background: #ff4d4f; padding: 4px 12px; border-radius: 4px; font-weight: bold;';
      console.log(
        '%c' + (success ? '✅' : '❌') + ' [SYNC END] ' + title,
        style,
        '⏰ ' + getTime()
      );
      console.log(
        '%c' + '═'.repeat(60),
        'color: #ddd;'
      );
    },

    log(message, data) {
      console.log(
        '%c[SYNC] ' + message,
        'color: #fa8c16; font-weight: bold;',
        data !== undefined ? data : ''
      );
    },

    data(label, data) {
      console.log(
        '%c[SYNC DATA] ' + label + ':',
        'color: #1890ff; background: #e6f7ff; padding: 2px 6px; border-radius: 3px;',
        data
      );
    },

    table(label, data) {
      console.log('%c[SYNC TABLE] ' + label, 'color: #1890ff; font-weight: bold;');
      if (Array.isArray(data)) {
        console.table(data);
      } else {
        console.log(data);
      }
    },

    error(message, error) {
      console.error(
        '%c❌ [SYNC ERROR] ' + message,
        'color: #ff4d4f; font-weight: bold;',
        error
      );
    },

    success(message, data) {
      console.log(
        '%c✅ [SYNC SUCCESS] ' + message,
        'color: #52c41a; font-weight: bold;',
        data !== undefined ? data : ''
      );
    },

    warning(message, data) {
      console.warn(
        '%c⚠️ [SYNC WARNING] ' + message,
        'color: #faad14; font-weight: bold;',
        data !== undefined ? data : ''
      );
    },
  },
};

// 默认导出
export default logger;
