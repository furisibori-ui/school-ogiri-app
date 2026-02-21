'use client'

import { useState, useRef, useEffect } from 'react'
import MapSelector from '@/components/MapSelector'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolWebsite from '@/components/SchoolWebsite'
import { SchoolData, LocationData } from '@/types/school'

export default function Home() {
  const [stage, setStage] = useState<'landing' | 'map' | 'school'>('landing')
  const [isGenerating, setIsGenerating] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const landingBgmRef = useRef<HTMLAudioElement | null>(null)
  const [showContent, setShowContent] = useState(false)

  // ランディングページのBGM制御（10秒休止付き）
  useEffect(() => {
    if (stage === 'landing') {
      const audio = landingBgmRef.current
      if (audio) {
        audio.volume = 0.3
        
        // 曲終了時のイベントリスナー
        const handleEnded = () => {
          console.log('🎵 BGM終了、10秒後に再開...')
          setTimeout(() => {
            if (stage === 'landing') {
              audio.play().catch(err => console.log('BGM再生失敗:', err))
            }
          }, 10000) // 10秒休止
        }
        
        audio.addEventListener('ended', handleEnded)
        audio.play().catch(err => console.log('BGM自動再生失敗:', err))
        
        return () => {
          audio.removeEventListener('ended', handleEnded)
        }
      }
    } else {
      // 他のページに移動したらBGM停止
      if (landingBgmRef.current) {
        landingBgmRef.current.pause()
        landingBgmRef.current.currentTime = 0
      }
    }
  }, [stage])

  // コンテンツのフェードイン制御
  useEffect(() => {
    if (stage === 'landing') {
      setShowContent(false)
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 500) // 0.5秒後にフェードイン開始
      return () => clearTimeout(timer)
    }
  }, [stage])

  const handleLocationSelect = async (location: LocationData) => {
    setIsGenerating(true)
    setError(null)
    setSchoolData(null)

    try {
      const response = await fetch('/api/generate-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
      })

      if (!response.ok) {
        throw new Error('学校の生成に失敗しました')
      }

      const data: SchoolData = await response.json()
      setSchoolData(data)
      setStage('school')

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setSchoolData(null)
    setError(null)
    setStage('landing')
  }

  const handleStartClick = () => {
    setStage('map')
  }

  const handleTestGenerate = () => {
    handleLocationSelect({
      lat: 35.6762,
      lng: 139.6503,
      address: '東京都港区芝公園',
      landmarks: ['東京タワー', '増上寺', '芝公園'],
    })
  }

  return (
    <main className="min-h-screen">
      {/* ランディングページBGM（loopなし、手動制御で10秒休止） */}
      <audio ref={landingBgmRef}>
        <source src="/bgm/landing-bgm.mp3" type="audio/mpeg" />
      </audio>

      {/* ステージ1: ランディングページ */}
      {stage === 'landing' && (
        <div className="h-screen flex items-center justify-center" style={{
          backgroundImage: 'url(/backgrounds/landing-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative'
        }}>
          {/* 明るいオーバーレイ（青空背景に合わせて軽く） */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.3) 100%)',
            zIndex: 1
          }} />
          
          {/* コンテンツ */}
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
            {/* メインタイトル画像（フェードイン） */}
            <img 
              src="/logo/title-logo.png"
              alt="架空学校生成システム"
              style={{
                width: '100%',
                maxWidth: '900px',
                height: 'auto',
                margin: '0 auto 2.5rem',
                display: 'block',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'translateY(0)' : 'translateY(-30px)',
                transition: 'opacity 2s ease-out, transform 2s ease-out'
              }}
              onError={(e) => {
                // 画像読み込み失敗時は超巨大テキストで表示
                e.currentTarget.style.display = 'none'
                const fallbackTitle = document.createElement('h1')
                fallbackTitle.textContent = '架空学校生成システム'
                fallbackTitle.style.cssText = `
                  font-family: var(--font-yuji-mai), "HGS行書体", "AR行書体M", cursive;
                  font-size: 7rem;
                  font-weight: 900;
                  color: #1a1a2e;
                  margin-bottom: 3rem;
                  text-shadow: 0 4px 12px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.6);
                  letter-spacing: 0.2em;
                  line-height: 1.2;
                `
                e.currentTarget.parentElement?.insertBefore(fallbackTitle, e.currentTarget)
              }}
            />

            {/* サブタイトル（フェードイン） */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: '3px solid #1a1a2e',
              padding: '2rem 3rem',
              margin: '0 auto 2.5rem',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              maxWidth: '800px',
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'opacity 2s ease-out 0.5s, transform 2s ease-out 0.5s'
            }}>
              <p style={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '1.3rem',
                color: '#1a1a2e',
                lineHeight: '2',
                letterSpacing: '0.08em',
                fontWeight: '600'
              }}>
                地図上の任意の場所をクリックすることで、<br />
                その土地の特性を反映した架空の学校サイトが自動生成されます
              </p>
            </div>

            {/* スタートボタン（フェードイン） */}
            <button
              onClick={handleStartClick}
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
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'scale(1)' : 'scale(0.8)',
                transitionProperty: 'opacity, transform, box-shadow, background',
                transitionDuration: '2s, 2s, 0.2s, 0.2s',
                transitionDelay: '1s, 1s, 0s, 0s',
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
              🗺️ 地図から場所を選ぶ
            </button>

            {/* テストボタン（フェードイン） */}
            <div style={{ 
              marginTop: '1.5rem',
              opacity: showContent ? 1 : 0,
              transition: 'opacity 2s ease-out 1.5s'
            }}>
              <button
                onClick={handleTestGenerate}
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '2px solid rgba(26,26,46,0.3)',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  color: '#1a1a2e',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontFamily: '"Noto Serif JP", serif',
                  transition: 'all 0.2s',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,1)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                🗼 テスト生成（東京タワー周辺）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ステージ2: 地図選択ページ */}
      {stage === 'map' && !isGenerating && (
        <div className="h-screen flex flex-col" style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}>
          {/* 簡潔なヘッダー */}
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
              fontSize: '1.5rem',
              color: '#d4af37',
              letterSpacing: '0.1em'
            }}>
              🗺️ 学校を設立する場所を選択してください
            </h2>
            
            <div style={{ width: '80px' }} /> {/* スペーサー */}
          </div>

          {/* 地図エリア */}
          <div className="flex-1" style={{ position: 'relative' }}>
            <MapSelector onLocationSelect={handleLocationSelect} />
            
            {/* 装飾的なコーナー */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100px',
              height: '100px',
              borderTop: '4px solid #d4af37',
              borderLeft: '4px solid #d4af37',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              borderTop: '4px solid #d4af37',
              borderRight: '4px solid #d4af37',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100px',
              height: '100px',
              borderBottom: '4px solid #d4af37',
              borderLeft: '4px solid #d4af37',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '100px',
              height: '100px',
              borderBottom: '4px solid #d4af37',
              borderRight: '4px solid #d4af37',
              pointerEvents: 'none'
            }} />
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

      {/* ローディング画面 */}
      {isGenerating && <LoadingScreen />}

      {/* ステージ3: 学校サイト表示 */}
      {stage === 'school' && schoolData && !isGenerating && (
        <SchoolWebsite data={schoolData} onReset={handleReset} />
      )}
    </main>
  )
}
