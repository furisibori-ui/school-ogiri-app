'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const loadingMessages = [
  '文部科学省に認可申請中...',
  '校長を面接中...',
  '校歌を作詞作曲中...',
  'マイクのテスト中... ポン、ポン',
  '校則を制定中...',
  '裏口入学を処理中...',
  '生徒手帳を印刷中...',
  'PTA会長を選出中...',
  '校庭の草を刈っています...',
  '校章をデザイン中...',
  '卒業アルバムの写真を撮影中...',
  '校舎の耐震工事を実施中...',
  '給食のメニューを考案中...',
  '部活動の顧問を配置中...',
  '教師が遅刻してます... お待ちください',
  '伝統を捏造中...',
]

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // メッセージを定期的に切り替え
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length)
    }, 2500)

    // プログレスバーのアニメーション
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev
        return prev + Math.random() * 5
      })
    }, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center z-50">
      <div className="text-center px-6 max-w-2xl">
        {/* 校章風のアイコン */}
        <motion.div
          className="mb-8 mx-auto w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center shadow-2xl"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="text-6xl">🏫</div>
        </motion.div>

        {/* タイトル */}
        <motion.h2
          className="text-4xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          学校を建設中
        </motion.h2>

        {/* ローディングメッセージ */}
        <div className="h-16 mb-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              className="text-xl text-blue-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {loadingMessages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-blue-950 rounded-full h-4 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <p className="text-blue-300 mt-4 text-sm">
          {Math.round(progress)}% 完了
        </p>

        {/* ドット */}
        <div className="flex justify-center mt-8 space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-yellow-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
