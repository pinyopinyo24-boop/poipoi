import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  isComplete?: boolean;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'gradient' | 'neon' | 'rainbow';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * スタイリッシュなプログレスバーコンポーネント
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  isComplete = false,
  label,
  showPercentage = true,
  variant = 'gradient',
  size = 'md',
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // スムーズなアニメーション
    const timer = setTimeout(() => {
      setDisplayProgress(Math.min(progress, 100));
    }, 50);
    return () => clearTimeout(timer);
  }, [progress]);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-blue-500',
    gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
    neon: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-lg shadow-cyan-500/50',
    rainbow:
      'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showPercentage && (
            <motion.span
              className="text-sm font-semibold text-blue-600 dark:text-blue-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {displayProgress}%
            </motion.span>
          )}
        </div>
      )}

      {/* プログレスバーコンテナ */}
      <div className={`w-full ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative`}>
        {/* 背景グロー効果 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
          animate={{
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />

        {/* プログレスバー */}
        <motion.div
          className={`h-full ${variantClasses[variant]} rounded-full relative overflow-hidden`}
          initial={{ width: '0%' }}
          animate={{ width: `${displayProgress}%` }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
        >
          {/* シャイン効果 */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            animate={{
              x: ['0%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>

        {/* 完了時のパーティクル効果 */}
        {isComplete && displayProgress === 100 && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-green-400 rounded-full"
                initial={{
                  x: '50%',
                  y: '50%',
                  opacity: 1,
                }}
                animate={{
                  x: `${50 + Math.random() * 100 - 50}%`,
                  y: `${50 + Math.random() * 100 - 50}%`,
                  opacity: 0,
                }}
                transition={{
                  duration: 1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* 完了メッセージ */}
      {isComplete && displayProgress === 100 && (
        <motion.div
          className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          ✓ 完了しました
        </motion.div>
      )}
    </div>
  );
};

export default ProgressBar;
