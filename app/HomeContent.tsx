'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import MapSelector from '@/components/MapSelector'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolWebsite from '@/components/SchoolWebsite'
import { SchoolData, LocationData } from '@/types/school'

export interface HomeContentProps {
  stage: 'landing' | 'map' | 'school'
  setStage: (s: 'landing' | 'map' | 'school') => void
  isGenerating: boolean
  schoolData: SchoolData | null
  jobId: string | null
  error: string | null
  apiFallbackMessage: string | null
  landingBgmRef: React.RefObject<HTMLAudioElement | null>
  showContent: { title: boolean; subtitle: boolean; startButton: boolean; testButton: boolean }
  showCongratulations?: boolean
  onLocationSelect: (location: LocationData) => void
  onReset: () => void
  onRetryAnthemAudio?: () => void
  onStartClick: () => void
  onTestGenerate: () => void
}

export default function HomeContent(props: HomeContentProps) {
  const {
    stage,
    setStage,
    isGenerating,
    schoolData,
    jobId,
    error,
    apiFallbackMessage,
    landingBgmRef,
    showContent,
    showCongratulations = false,
    onLocationSelect,
    onReset,
    onRetryAnthemAudio,
    onStartClick,
    onTestGenerate,
  } = props

  return (
    <div className="min-h-screen" role="main">
      <audio ref={landingBgmRef as React.RefObject<HTMLAudioElement>}>
        <source src="/bgm/landing-bgm.mp3" type="audio/mpeg" />
      </audio>

      <AnimatePresence>
        {showCongratulations && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)',
              pointerEvents: 'none'
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 120, duration: 0.5 }}
              style={{
                textAlign: 'center',
                padding: '2rem'
              }}
            >
              <motion.span
                animate={{
                  textShadow: [
                    '0 0 20px #fff, 0 0 40px #ffd700, 0 0 60px #ffd700',
                    '0 0 30px #fff, 0 0 60px #ffd700, 0 0 90px #ff8c00',
                    '0 0 20px #fff, 0 0 40px #ffd700, 0 0 60px #ffd700'
                  ]
                }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                style={{
                  fontSize: 'clamp(2.5rem, 12vw, 5.5rem)',
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                  color: '#fff',
                  background: 'linear-gradient(180deg, #fff 0%, #ffd700 40%, #ff8c00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8))',
                  textTransform: 'uppercase',
                  fontFamily: 'system-ui, "Arial Black", sans-serif'
                }}
              >
                Congratulations!
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {stage === 'landing' && (
        <div className="h-screen flex items-center justify-center" style={{
          backgroundImage: 'url(/backgrounds/landing-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.3) 100%)',
            zIndex: 1
          }} />
          <div style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '1000px',
            width: '90%',
            textAlign: 'center',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/logo/title-logo.png"
              alt="架空学校生成システム"
              style={{
                width: '100%',
                maxWidth: '1000px',
                height: 'auto',
                margin: '0 auto 2.5rem',
                display: 'block',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                opacity: showContent.title ? 1 : 0,
                transform: showContent.title ? 'translateY(0)' : 'translateY(-30px)',
                transition: 'opacity 1s ease-out, transform 1s ease-out'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fallbackTitle = document.createElement('h1')
                fallbackTitle.textContent = '架空学校生成システム'
                fallbackTitle.style.cssText = [
                  'font-family: var(--font-yuji-mai), "HGS行書体", "AR行書体M", cursive',
                  'font-size: 9rem',
                  'font-weight: 900',
                  'color: #1a1a2e',
                  'margin-bottom: 3rem',
                  'text-shadow: 0 4px 12px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.6)',
                  'letter-spacing: 0.2em',
                  'line-height: 1.2',
                ].join('; ')
                e.currentTarget.parentElement?.insertBefore(fallbackTitle, e.currentTarget)
              }}
            />
            <p style={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '0.95rem',
              color: '#1a1a2e',
              lineHeight: '1.8',
              letterSpacing: '0.05em',
              fontWeight: '500',
              margin: '0 auto 2.5rem',
              maxWidth: '700px',
              textShadow: '0 2px 4px rgba(255,255,255,0.8)',
              opacity: showContent.subtitle ? 1 : 0,
              transform: showContent.subtitle ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'opacity 0.8s ease-out, transform 0.8s ease-out'
            }}>
              地図上の任意の場所をクリックすることで、<br />
              その土地の特性を反映した架空の学校サイトが自動生成されます。
            </p>
            <button
              onClick={() => {
                if (landingBgmRef.current && landingBgmRef.current.paused) {
                  landingBgmRef.current.play().catch(() => {})
                }
                onStartClick()
              }}
              style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #0f1419 100%)',
                border: '4px solid #1a1a2e',
                padding: '1.8rem 4.5rem',
                fontSize: '1.7rem',
                fontWeight: 'bold',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontFamily: '"Noto Serif JP", serif',
                letterSpacing: '0.12em',
                marginTop: '1rem',
                opacity: showContent.startButton ? 1 : 0,
                transform: showContent.startButton ? 'scale(1)' : 'scale(0.8)',
                transitionProperty: 'opacity, transform, box-shadow, background',
                transitionDuration: '0.5s, 0.5s, 0.2s, 0.2s',
                transitionDelay: '0s, 0s, 0s, 0s',
                transitionTimingFunction: 'ease-out, ease-out, ease, ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                e.currentTarget.style.background = 'linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                e.currentTarget.style.background = 'linear-gradient(180deg, #1a1a2e 0%, #0f1419 100%)'
              }}
            >
              開校する場所を選ぶ
            </button>
            <div style={{ position: 'absolute', right: '2rem', bottom: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link href="/settings" style={{ fontSize: '0.7rem', color: 'rgba(26,26,46,0.7)', textDecoration: 'none' }}>API設定</Link>
              <button
                onClick={onTestGenerate}
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(26,26,46,0.2)',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.7rem',
                  color: 'rgba(26,26,46,0.6)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontFamily: '"Noto Serif JP", serif',
                  transition: 'all 0.2s',
                  fontWeight: '400',
                  opacity: showContent.testButton ? 0.5 : 0,
                  letterSpacing: '0.02em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.9)'
                  e.currentTarget.style.color = '#1a1a2e'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
                  e.currentTarget.style.color = 'rgba(26,26,46,0.6)'
                }}
              >
                テスト生成
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'map' && !isGenerating && (
        <div className="h-screen flex flex-col" style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 100%)',
            borderBottom: '4px solid #d4af37',
            padding: '1.5rem 2rem',
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setStage('landing')}
              style={{
                background: 'rgba(212,175,55,0.2)',
                border: '2px solid rgba(212,175,55,0.5)',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                color: '#d4af37',
                cursor: 'pointer',
                borderRadius: '4px',
                fontFamily: '"Noto Serif JP", serif'
              }}
            >
              ← 戻る
            </button>
            <h2 style={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '1.2rem',
              color: '#d4af37',
              letterSpacing: '0.1em'
            }}>
              開校する場所を選ぶ
            </h2>
            <div style={{ width: '80px' }} />
          </div>
          <div className="flex-1" style={{ position: 'relative' }}>
            <MapSelector onLocationSelect={onLocationSelect} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', borderTop: '4px solid #d4af37', borderLeft: '4px solid #d4af37', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', borderTop: '4px solid #d4af37', borderRight: '4px solid #d4af37', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100px', height: '100px', borderBottom: '4px solid #d4af37', borderLeft: '4px solid #d4af37', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '100px', height: '100px', borderBottom: '4px solid #d4af37', borderRight: '4px solid #d4af37', pointerEvents: 'none' }} />
          </div>
          {error && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#8b0000',
              color: 'white',
              padding: '1.5rem 2rem',
              borderRadius: '8px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
              border: '3px solid #d4af37',
              fontSize: '1.1rem',
              fontFamily: '"Noto Serif JP", serif',
              zIndex: 1000
            }}>
              {error}
            </div>
          )}
        </div>
      )}

      {isGenerating && <LoadingScreen />}

      {stage === 'school' && schoolData && !isGenerating && (
        <>
          {apiFallbackMessage && (
            <div
              role="alert"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: '#fef3c7',
                borderBottom: '3px solid #d97706',
                color: '#92400e',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              ⚠️ APIエラーのため、表示されているテキストはダミー（モック）です。 — {apiFallbackMessage}
            </div>
          )}
          {(() => {
            const noAudio = !schoolData.school_anthem?.audio_url
            const emblemPlaceholder = schoolData.school_profile?.emblem_url?.includes('placehold.co')
            const facePlaceholder = schoolData.principal_message?.face_image_url?.includes('placehold.co')
            const imagesIncomplete = emblemPlaceholder && facePlaceholder
            if (noAudio || imagesIncomplete) {
              return (
                <div
                  role="alert"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    backgroundColor: '#dbeafe',
                    borderBottom: '3px solid #2563eb',
                    color: '#1e40af',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  ⚠️ 画像または校歌の音声が生成されていません。処理の途中で失敗したか、時間切れの可能性があります。もう一度「学校生成」をお試しください。
                </div>
              )
            }
            return null
          })()}
          {jobId && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderBottom: '1px solid #e5e7eb',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.9rem', color: '#374151' }}>共有リンク:</span>
              <Link
                href={`/school/${jobId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.85rem',
                  color: '#2563eb',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                /school/{jobId}
              </Link>
              <button
                type="button"
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/school/${jobId}`
                  navigator.clipboard?.writeText(url).then(() => alert('リンクをコピーしました！'))
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                コピー
              </button>
            </div>
          )}
          <SchoolWebsite data={schoolData} onReset={onReset} onRetryAnthemAudio={onRetryAnthemAudio} />
        </>
      )}
    </div>
  )
}
