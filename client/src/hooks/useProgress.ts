import { useState, useCallback, useRef } from 'react';

interface ProgressState {
  progress: number;
  isComplete: boolean;
  message: string;
}

/**
 * プログレス追跡カスタムフック
 */
export const useProgress = (initialMessage: string = '処理中...') => {
  const [state, setState] = useState<ProgressState>({
    progress: 0,
    isComplete: false,
    message: initialMessage,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * プログレスを開始
   */
  const start = useCallback((message?: string) => {
    setState({
      progress: 0,
      isComplete: false,
      message: message || initialMessage,
    });

    // 自動進行（0-90%）
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.progress >= 90) {
          return prev;
        }

        // ランダムな増加量（1-5%）
        const increment = Math.random() * 4 + 1;
        return {
          ...prev,
          progress: Math.min(prev.progress + increment, 90),
        };
      });
    }, 200);
  }, [initialMessage]);

  /**
   * プログレスを更新
   */
  const update = useCallback((progress: number, message?: string) => {
    setState((prev) => ({
      ...prev,
      progress: Math.min(Math.max(progress, 0), 100),
      message: message || prev.message,
    }));
  }, []);

  /**
   * 完了
   */
  const complete = useCallback((message?: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState({
      progress: 100,
      isComplete: true,
      message: message || '完了しました',
    });
  }, []);

  /**
   * リセット
   */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState({
      progress: 0,
      isComplete: false,
      message: initialMessage,
    });
  }, [initialMessage]);

  return {
    progress: state.progress,
    isComplete: state.isComplete,
    message: state.message,
    start,
    update,
    complete,
    reset,
  };
};

export default useProgress;
