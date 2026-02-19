'use client'

import { useState } from 'react'
import MapSelector from '@/components/MapSelector'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolWebsite from '@/components/SchoolWebsite'
import { SchoolData, LocationData } from '@/types/school'

export default function Home() {
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

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setSchoolData(null)
    setError(null)
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
      {!schoolData && !isGenerating && (
        <div className="h-screen flex flex-col" style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}>
          {/* 厳かなヘッダー */}
          <div style={{
            background: 'linear-gradient(180deg, #0f1419 0%, #1a2332 100%)',
            borderBottom: '8px double #d4af37',
            padding: '3rem 2rem',
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            {/* 装飾的なライン */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #d4af37, transparent)'
            }} />

            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
              {/* メインタイトル */}
              <h1 style={{
                fontFamily: 'var(--font-yuji-mai), "HGS行書体", "AR行書体M", cursive',
                fontSize: '4rem',
                fontWeight: 'bold',
                color: '#d4af37',
                marginBottom: '1rem',
                textShadow: '0 4px 8px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.3)',
                letterSpacing: '0.15em',
                lineHeight: '1.3'
              }}>
                架空学校
              </h1>

              {/* サブタイトル */}
              <div style={{
                backgroundColor: 'rgba(212,175,55,0.1)',
                border: '2px solid #d4af37',
                padding: '1rem 2rem',
                margin: '2rem auto',
                maxWidth: '800px',
                borderRadius: '8px',
                boxShadow: 'inset 0 2px 8px rgba(212,175,55,0.2)'
              }}>
                <p style={{
                  fontFamily: '"Noto Serif JP", serif',
                  fontSize: '1.25rem',
                  color: '#f0e6d2',
                  lineHeight: '2',
                  letterSpacing: '0.1em'
                }}>
                  地図上の任意の場所をクリックすることで、<br />
                  その土地の特性を反映した架空の学校サイトが自動生成されます
                </p>
              </div>

              {/* 大きな生成ボタン */}
              <button
                onClick={handleTestGenerate}
                style={{
                  background: 'linear-gradient(180deg, #d4af37 0%, #b8941f 100%)',
                  border: '4px solid #8b7355',
                  padding: '1.5rem 4rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#1a1a2e',
                  cursor: 'pointer',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  fontFamily: '"Noto Serif JP", serif',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                  marginTop: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5), inset 0 2px 4px rgba(0,0,0,0.3)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
              >
                🎓 この地に学校を創立する
              </button>

              {/* テストボタン（小さく） */}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleTestGenerate}
                  style={{
                    background: 'rgba(212,175,55,0.2)',
                    border: '2px solid rgba(212,175,55,0.5)',
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.9rem',
                    color: '#d4af37',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontFamily: '"Noto Serif JP", serif',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.3)'
                    e.currentTarget.style.borderColor = '#d4af37'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.2)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'
                  }}
                >
                  🗼 テスト生成（東京タワー周辺）
                </button>
              </div>
              
              {/* デバッグ情報 */}
              <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#6b7280' }}>
                <p>💡 Google Maps API: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ 設定済み' : '❌ 未設定'}</p>
              </div>
            </div>

            {/* 装飾的なライン（下） */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #d4af37, transparent)'
            }} />
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

      {isGenerating && <LoadingScreen />}

      {schoolData && !isGenerating && (
        <SchoolWebsite data={schoolData} onReset={handleReset} />
      )}
    </main>
  )
}
