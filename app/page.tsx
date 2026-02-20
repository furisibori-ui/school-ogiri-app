'use client'

import { useState } from 'react'
import MapSelector from '@/components/MapSelector'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolWebsite from '@/components/SchoolWebsite'
import { SchoolData, LocationData } from '@/types/school'

export default function Home() {
  const [stage, setStage] = useState<'landing' | 'map' | 'school'>('landing')
  const [isGenerating, setIsGenerating] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      {/* ステージ1: ランディングページ */}
      {stage === 'landing' && (
        <div className="h-screen flex items-center justify-center" style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}>
          <div style={{ maxWidth: '900px', textAlign: 'center', padding: '2rem' }}>
            {/* メインタイトル */}
            <h1 style={{
              fontFamily: 'var(--font-yuji-mai), "HGS行書体", "AR行書体M", cursive',
              fontSize: '5rem',
              fontWeight: 'bold',
              color: '#d4af37',
              marginBottom: '2rem',
              textShadow: '0 4px 8px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.3)',
              letterSpacing: '0.15em',
              lineHeight: '1.3'
            }}>
              架空学校生成システム
            </h1>

            {/* サブタイトル */}
            <div style={{
              backgroundColor: 'rgba(212,175,55,0.1)',
              border: '2px solid #d4af37',
              padding: '2rem 3rem',
              margin: '2rem auto',
              borderRadius: '8px',
              boxShadow: 'inset 0 2px 8px rgba(212,175,55,0.2)'
            }}>
              <p style={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '1.4rem',
                color: '#f0e6d2',
                lineHeight: '2.2',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem'
              }}>
                地図上の任意の場所をクリックすることで、<br />
                その土地の特性を反映した架空の学校サイトが自動生成されます
              </p>
              <p style={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '1rem',
                color: '#b8a894',
                lineHeight: '1.8',
                letterSpacing: '0.05em'
              }}>
                地域の地形・歴史・文化・産業を徹底的にリサーチし、<br />
                その土地ならではの学校を創造します
              </p>
            </div>

            {/* スタートボタン */}
            <button
              onClick={handleStartClick}
              style={{
                background: 'linear-gradient(180deg, #d4af37 0%, #b8941f 100%)',
                border: '4px solid #8b7355',
                padding: '2rem 5rem',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                color: '#1a1a2e',
                cursor: 'pointer',
                boxShadow: '0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontFamily: '"Noto Serif JP", serif',
                letterSpacing: '0.1em',
                transition: 'all 0.2s',
                marginTop: '3rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
              }}
            >
              🗺️ 地図から場所を選ぶ
            </button>

            {/* テストボタン */}
            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={handleTestGenerate}
                style={{
                  background: 'rgba(212,175,55,0.2)',
                  border: '2px solid rgba(212,175,55,0.5)',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  color: '#d4af37',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontFamily: '"Noto Serif JP", serif',
                  transition: 'all 0.2s'
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
