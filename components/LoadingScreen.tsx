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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{ textAlign: 'center', padding: '0 1.5rem', maxWidth: '800px' }}>
        {/* 校章風のアイコン */}
        <motion.div
          style={{
            marginBottom: '2rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: '10rem',
            height: '10rem',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(212,175,55,0.5), 0 8px 24px rgba(0,0,0,0.6)',
            border: '4px solid #8b7355'
          }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div style={{ fontSize: '4rem' }}>🏫</div>
        </motion.div>

        {/* タイトル */}
        <motion.h2
          style={{
            fontFamily: 'var(--font-yuji-mai), "HGS行書体", "AR行書体M", cursive',
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#d4af37',
            marginBottom: '1.5rem',
            textShadow: '0 4px 8px rgba(0,0,0,0.8)',
            letterSpacing: '0.15em'
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          学校建設中
        </motion.h2>

        {/* ローディングメッセージ */}
        <div style={{ 
          height: '4rem', 
          marginBottom: '2rem',
          backgroundColor: 'rgba(212,175,55,0.1)',
          border: '2px solid rgba(212,175,55,0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              style={{
                fontSize: '1.25rem',
                color: '#f0e6d2',
                fontFamily: '"Noto Serif JP", serif',
                letterSpacing: '0.05em'
              }}
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
        <div style={{ 
          width: '100%', 
          background: 'rgba(15,20,25,0.8)',
          borderRadius: '8px',
          height: '1.5rem',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
          border: '2px solid #8b7355'
        }}>
          <motion.div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)',
              boxShadow: '0 0 20px rgba(212,175,55,0.5)'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <p style={{
          color: '#d4af37',
          marginTop: '1rem',
          fontSize: '1rem',
          fontFamily: '"Noto Serif JP", serif',
          fontWeight: 'bold',
          letterSpacing: '0.1em'
        }}>
          進捗率：{Math.round(progress)}%
        </p>

        {/* ドット */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '0.5rem' }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                width: '0.75rem',
                height: '0.75rem',
                background: '#d4af37',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(212,175,55,0.5)'
              }}
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
