import React from 'react';
import { motion } from 'framer-motion';

interface CompletionAnimationProps {
  isVisible: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

/**
 * 完了時のアニメーションコンポーネント
 */
export const CompletionAnimation: React.FC<CompletionAnimationProps> = ({
  isVisible,
  message = '処理完了！',
  duration = 2,
  onComplete,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.5 },
    },
  };

  const itemVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      } as any,
    },
  };

  const checkmarkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
      } as any,
    },
  };

  const confettiVariants = {
    hidden: { y: 0, opacity: 1 },
    visible: (i: number) => ({
      y: -200,
      opacity: 0,
      rotate: Math.random() * 360,
      transition: {
        duration: 1.5,
        delay: i * 0.05,
      } as any,
    }),
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onAnimationComplete={() => {
        setTimeout(() => {
          onComplete?.();
        }, duration * 1000);
      }}
    >
      {/* 背景オーバーレイ */}
      <motion.div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* メインコンテンツ */}
      <motion.div
        className="relative flex flex-col items-center gap-6"
        variants={itemVariants}
      >
        {/* チェックマークサークル */}
        <motion.div
          className="relative w-24 h-24"
          variants={itemVariants}
        >
          {/* 外側のリング */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-green-400"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* グロー効果 */}
          <motion.div
            className="absolute inset-0 rounded-full bg-green-400/20 blur-lg"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />

          {/* チェックマーク */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M 20 50 L 40 70 L 80 30"
              stroke="rgb(34, 197, 94)"
              variants={checkmarkVariants}
            />
          </svg>
        </motion.div>

        {/* メッセージ */}
        <motion.div
          className="text-center"
          variants={itemVariants}
        >
          <motion.h2
            className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {message}
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-400 text-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            超高速で処理が完了しました
          </motion.p>
        </motion.div>

        {/* パーティクル効果 */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full"
              initial={{
                x: 0,
                y: 0,
              }}
              animate={{
                x: Math.cos((i / 12) * Math.PI * 2) * 100,
                y: Math.sin((i / 12) * Math.PI * 2) * 100,
              }}
              transition={{
                duration: 0.5,
              }}
            />
          ))}
        </div>

        {/* コンフェッティ */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`confetti-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: ['#22c55e', '#10b981', '#34d399', '#6ee7b7'][
                i % 4
              ],
              left: '50%',
              top: '50%',
            }}
            custom={i}
            variants={confettiVariants}
            initial="hidden"
            animate="visible"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default CompletionAnimation;
