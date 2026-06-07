/**
 * Store 错误处理工具
 * 提供统一的错误处理模式
 */

const LOG_PREFIX = '[FLOATNOTE]';

/**
 * Store 操作结果类型
 */
export interface StoreResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 统一的 store 错误处理包装函数
 * 捕获异常、记录日志、设置错误状态
 */
export async function withStoreError<T>(
  operation: () => Promise<T>,
  errorSetter: (error: string | null) => void,
  context: string
): Promise<StoreResult<T>> {
  try {
    errorSetter(null);
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} ${context}:`, error);
    errorSetter(message);
    return { success: false, error: message };
  }
}

/**
 * 统一的 store loading 状态管理
 */
export function createLoadingManager() {
  let loadingCount = 0;

  return {
    start: (setter: (loading: boolean) => void) => {
      loadingCount++;
      setter(true);
    },
    end: (setter: (loading: boolean) => void) => {
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadingCount === 0) {
        setter(false);
      }
    },
  };
}
