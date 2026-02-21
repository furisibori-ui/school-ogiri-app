'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
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
  const [showContent, setShowContent] = useState({
    title: false,
    subtitle: false,
    startButton: false,
    testButton: false
  })

  // ランディングページのBGM制御（5秒休止付き）
  useEffect(() => {
    if (stage === 'landing') {
      const audio = landingBgmRef.current
      if (!audio) {
        console.warn('⚠️ BGM audio要素が見つかりません')
        return
      }
      
      console.log('🎵 BGM初期化開始...')
      audio.volume = 0.3
      
      // 曲終了時のイベントリスナー
      const handleEnded = () => {
        console.log('🎵 BGM終了、5秒後に再開...')
        setTimeout(() => {
          if (stage === 'landing') {
            audio.play().catch(err => console.error('BGM再生失敗:', err))
          }
        }, 5000) // 5秒休止
      }
      
      // エラーハンドリング
      const handleError = (e: any) => {
        console.error('❌ BGM読み込みエラー:', e)
        console.error('ファイルパス確認: /bgm/landing-bgm.mp3')
      }
      
      // 再生可能状態の確認
      const handleCanPlay = () => {
        console.log('✅ BGMが再生可能になりました')
      }
      
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)
      audio.addEventListener('canplay', handleCanPlay)
      
      // ユーザーインタラクション後に再生を試みる（確実に再生させる）
      const playBGM = () => {
        audio.play()
          .then(() => {
            console.log('✅ BGM再生開始')
            document.removeEventListener('click', playBGM)
            document.removeEventListener('keydown', playBGM)
          })
          .catch(err => console.warn('⚠️ BGM再生失敗:', err))
      }
      
      // 最初のクリックまたはキー入力でBGMを再生
      document.addEventListener('click', playBGM, { once: true })
      document.addEventListener('keydown', playBGM, { once: true })
      
      // 即座に再生も試みる（成功すればイベントリスナーは削除される）
      playBGM()
      
      return () => {
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        audio.removeEventListener('canplay', handleCanPlay)
      }
    } else {
      // 他のページに移動したらBGM停止
      if (landingBgmRef.current) {
        landingBgmRef.current.pause()
        landingBgmRef.current.currentTime = 0
      }
    }
  }, [stage])

  // コンテンツのフェードイン制御（段階的に表示、3秒で完了）
  useEffect(() => {
    if (stage === 'landing') {
      setShowContent({ title: false, subtitle: false, startButton: false, testButton: false })
      
      // タイトル: 0.5秒後にフェードイン開始
      const titleTimer = setTimeout(() => {
        setShowContent(prev => ({ ...prev, title: true }))
      }, 500)
      
      // 説明文: 1.5秒後に表示
      const subtitleTimer = setTimeout(() => {
        setShowContent(prev => ({ ...prev, subtitle: true }))
      }, 1500)
      
      // スタートボタン: 2.5秒後に表示
      const startButtonTimer = setTimeout(() => {
        setShowContent(prev => ({ ...prev, startButton: true }))
      }, 2500)
      
      // テストボタン: 3秒後に表示
      const testButtonTimer = setTimeout(() => {
        setShowContent(prev => ({ ...prev, testButton: true }))
      }, 3000)
      
      return () => {
        clearTimeout(titleTimer)
        clearTimeout(subtitleTimer)
        clearTimeout(startButtonTimer)
        clearTimeout(testButtonTimer)
      }
    } else {
      setShowContent({ title: false, subtitle: false, startButton: false, testButton: false })
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
      {/* ランディングページBGM（loopなし、手動制御で5秒休止） */}
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
            {/* メインタイトル画像（フェードイン - 5秒かけてゆっくり） */}
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
                // 画像読み込み失敗時は超巨大テキストで表示
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

            {/* サブタイトル（タイトル表示後にフェードイン、枠なし） */}
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

            {/* スタートボタン（説明文の後にフェードイン） */}
            <button
              onClick={() => {
                // BGMを確実に再生（ユーザーインタラクションで制限解除）
                if (landingBgmRef.current && landingBgmRef.current.paused) {
                  landingBgmRef.current.play().catch(err => console.error('BGM再生失敗:', err))
                }
                handleStartClick()
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

            {/* 設定・テストボタン（右端に小さく配置） */}
            <div style={{ position: 'absolute', right: '2rem', bottom: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/settings" style={{ fontSize: '0.7rem', color: 'rgba(26,26,46,0.7)', textDecoration: 'none' }}>API設定</Link>
            <button
              onClick={handleTestGenerate}
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
              fontSize: '1.2rem',
              color: '#d4af37',
              letterSpacing: '0.1em'
            }}>
              開校する場所を選ぶ
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
