'use client'

import { SchoolData } from '@/types/school'
import { useEffect, useRef, useState } from 'react'

interface SchoolWebsiteProps {
  data: SchoolData
  onReset: () => void
  /** 校歌音声の再生成を依頼（再生ボタンがまだのときに「再試行」で呼ぶ） */
  onRetryAnthemAudio?: () => void
}

export default function SchoolWebsite({ data, onReset, onRetryAnthemAudio }: SchoolWebsiteProps) {
  // データが不完全なときはクラッシュせず簡易表示（API部分応答・型と実データのずれ対策）
  if (!data?.school_profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>表示するデータがありません。</p>
        <button type="button" onClick={onReset} style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' }}>最初に戻る</button>
      </div>
    )
  }

  // BGM用のaudio要素の参照
  const bgmRef = useRef<HTMLAudioElement>(null)
  const anthemRef = useRef<HTMLAudioElement>(null)
  // 校歌の音声URLが期限切れなどで読み込めなかったとき
  const [anthemAudioError, setAnthemAudioError] = useState(false)
  useEffect(() => {
    setAnthemAudioError(false)
  }, [data.school_anthem?.audio_url])

  // BGMを自動再生（昔のサイトっぽく）
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = 0.3 // 音量を30%に
      bgmRef.current.play().catch(() => {
        // 自動再生がブロックされた場合は無視
      })
    }
  }, [])

  // 校歌再生時にBGMを停止
  const handleAnthemPlay = () => {
    if (bgmRef.current) {
      bgmRef.current.pause()
    }
  }

  // 校歌停止時にBGMを再開
  const handleAnthemPause = () => {
    if (bgmRef.current) {
      bgmRef.current.play().catch(() => {})
    }
  }
  const styleConfig = data.style_config || {
    layout: 'two-column',
    colorTheme: {
      headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      headerText: '#ffffff',
      bgColor: '#f5f5f0',
      cardBg: '#ffffff',
      accentColor: '#2563eb',
      textColor: '#374151',
      borderColor: '#d1d5db'
    },
    typography: {
      titleSize: '3rem',
      headingSize: '1.75rem',
      bodySize: '0.95rem',
      fontFamily: '"Noto Serif JP", serif'
    },
    spacing: {
      sectionGap: '0.5rem',
      cardPadding: '0.7rem'
    },
    headerStyle: {
      emblemSize: '11rem',
      schoolNameSize: '4rem',
      schoolNameDecoration: 'shadow',
      showMottoInHeader: true
    },
    sectionOrder: []
  }

  // 筆文字フォント（楷書体風）。末尾にフォールバックを付けて、未収録文字が ??? にならないようにする
  const calligraphyFont = 'var(--font-yuji-mai), "HGS行書体", "AR行書体M", "Noto Sans JP", "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'

  // 【重要】sections オブジェクト内で key: 条件 ? ( <section>... ) と書くと Vercel/SWC が
  // "<" を比較演算子と解釈し "Unexpected token `section`" でビルド失敗する。
  // 三項で JSX を返すセクションは必ずオブジェクトの外で変数に切り出し、key: 変数 で渡すこと。
  const hasFacilities = data.multimedia_content?.facilities && data.multimedia_content.facilities.length > 0
  const hasMonuments = data.multimedia_content?.monuments && data.multimedia_content.monuments.length > 0
  const hasUniforms = data.multimedia_content?.uniforms && data.multimedia_content.uniforms.length > 0

  // 施設紹介（写真なし・テキストのみ）
  const facilitiesOnlySection = hasFacilities ? (
    <section key="facilities" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
      <h2 style={{ fontSize: styleConfig.typography.headingSize, color: styleConfig.colorTheme.accentColor, borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`, paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: styleConfig.typography.fontFamily, textAlign: 'center' }}>◇ 施設紹介 ◇</h2>
      <div style={{ padding: styleConfig.spacing.cardPadding, backgroundColor: styleConfig.colorTheme.cardBg, borderRadius: '8px', border: `2px solid ${styleConfig.colorTheme.borderColor}` }}>
        {(data.multimedia_content?.facilities ?? []).map((facility, index) => (
          <div key={index} style={{ marginBottom: index < (data.multimedia_content?.facilities ?? []).length - 1 ? '1rem' : 0, paddingBottom: index < (data.multimedia_content?.facilities ?? []).length - 1 ? '1rem' : 0, borderBottom: index < (data.multimedia_content?.facilities ?? []).length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.05rem' }}>{facility.name}</h3>
            <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.7' }}>{facility.description}</p>
          </div>
        ))}
      </div>
    </section>
  ) : null

  // 銅像（独立セクション・写真をでかく）
  const monumentSection = hasMonuments ? (
    <section key="monument" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
      <h2 style={{ fontSize: styleConfig.typography.headingSize, color: styleConfig.colorTheme.accentColor, borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`, paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: styleConfig.typography.fontFamily, textAlign: 'center' }}>◆ 銅像 ◆</h2>
      <div style={{ padding: styleConfig.spacing.cardPadding, backgroundColor: styleConfig.colorTheme.cardBg, borderRadius: '8px', border: `2px solid ${styleConfig.colorTheme.borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {(data.multimedia_content?.monuments ?? []).map((monument, index) => (
          <div key={index}>
            {monument.image_url && (
              <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 1rem', aspectRatio: '3/4', maxHeight: '560px', overflow: 'hidden', borderRadius: '8px', border: `4px solid ${styleConfig.colorTheme.accentColor}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <img src={monument.image_url} alt={monument.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.25rem', textAlign: 'center' }}>{monument.name}</h3>
            <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.8', textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>{monument.description}</p>
          </div>
        ))}
      </div>
    </section>
  ) : null

  // 制服（独立セクション・写真をでかく）
  const uniformSection = hasUniforms ? (
    <section key="uniform" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
      <h2 style={{ fontSize: styleConfig.typography.headingSize, color: styleConfig.colorTheme.accentColor, borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`, paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: styleConfig.typography.fontFamily, textAlign: 'center' }}>◇ 制服紹介 ◇</h2>
      <div style={{ padding: styleConfig.spacing.cardPadding, backgroundColor: styleConfig.colorTheme.cardBg, borderRadius: '8px', border: `2px solid ${styleConfig.colorTheme.borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {(data.multimedia_content?.uniforms ?? []).map((uniform, index) => (
          <div key={index}>
            {uniform.image_url && (
              <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 1rem', aspectRatio: '3/4', maxHeight: '560px', overflow: 'hidden', borderRadius: '8px', border: `4px solid ${styleConfig.colorTheme.accentColor}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <img src={uniform.image_url} alt={uniform.type} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.25rem', color: styleConfig.colorTheme.accentColor, textAlign: 'center' }}>{uniform.type}</h3>
            <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.8', textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>{uniform.description}</p>
          </div>
        ))}
      </div>
    </section>
  ) : null

  // 新規セクションを追加するとき：三項で <section> を返すなら上のように変数化し、ここでは key: 変数 のみ書く
  const sections: { [key: string]: JSX.Element | null } = {
    news: (data.news_feed ?? []).length > 0 ? (
      <section key="news" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: 'white',
          backgroundColor: '#dc2626',
          padding: '0.75rem',
          marginBottom: '0',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center',
          border: '3px solid #991b1b',
          borderBottom: 'none',
          fontWeight: 'bold',
          letterSpacing: '0.1em'
        }}>
          ★ 新着情報 ★
        </h2>
        <div style={{ 
          border: `3px solid #991b1b`,
          backgroundColor: styleConfig.colorTheme.cardBg,
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          {(data.news_feed ?? []).map((news, index) => (
            <div key={index} style={{ 
              padding: '0.75rem 1rem',
              borderBottom: index < (data.news_feed ?? []).length - 1 ? `2px dotted ${styleConfig.colorTheme.borderColor}` : 'none',
              display: 'flex',
              gap: '1rem',
              fontSize: styleConfig.typography.bodySize,
              color: styleConfig.colorTheme.textColor,
              backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
            }}>
              <span style={{ 
                whiteSpace: 'nowrap', 
                fontWeight: 'bold',
                color: '#dc2626'
              }}>
                {news.date}
              </span>
              <span style={{ 
                backgroundColor: styleConfig.colorTheme.accentColor,
                color: 'white',
                padding: '0.125rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {news.category}
              </span>
              <span style={{ lineHeight: '1.8' }}>{news.text}</span>
            </div>
          ))}
        </div>
      </section>
    ) : <></>,

    principal: data.principal_message ? (
      <section key="principal" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ 学校長挨拶 ◆
        </h2>
        <div style={{ 
          border: `3px double ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg,
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            {data.principal_message?.face_image_url && (
              <div style={{ display: 'inline-block' }}>
                <img
                  src={data.principal_message.face_image_url}
                  alt={data.principal_message?.name ?? ''}
                  style={{ 
                    width: '32rem',  // 16rem → 32rem（2倍）
                    height: '32rem', // 16rem → 32rem（2倍）
                    objectFit: 'cover', 
                    border: `8px solid ${styleConfig.colorTheme.accentColor}`, // 5px → 8px
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)', // より強い影
                    marginBottom: '0.75rem'
                  }}
                />
                <div style={{
                  backgroundColor: styleConfig.colorTheme.accentColor,
                  color: 'white',
                  padding: '1rem', // 0.5rem → 1rem
                  fontWeight: 'bold',
                  fontSize: '2rem', // 1.25rem → 2rem
                  border: '5px solid gold', // 3px → 5px
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  {data.principal_message?.name} {data.principal_message?.title}
                </div>
              </div>
            )}
          </div>
          <div style={{
            backgroundColor: '#fffef0',
            padding: '1rem',
            border: `2px solid ${styleConfig.colorTheme.borderColor}`,
            borderRadius: '4px'
          }}>
            <p style={{ 
              fontSize: styleConfig.typography.bodySize,
              lineHeight: '2',
              whiteSpace: 'pre-line',
              color: styleConfig.colorTheme.textColor,
              textIndent: '1em'
            }}>
              {data.principal_message?.text ?? ''}
            </p>
          </div>
        </div>
      </section>
    ) : null,

    overview: (
      <section key="overview" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◇ 学校概要 ◇
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          {/* 現在の校舎の画像（配列の最後＝現校舎） */}
          {data.school_profile.historical_buildings && data.school_profile.historical_buildings.length > 0 && (() => {
            const currentBuilding = data.school_profile.historical_buildings[data.school_profile.historical_buildings.length - 1]
            return (
              <div style={{ marginBottom: '1rem' }}>
                <img
                  src={currentBuilding.image_url || 'https://placehold.co/800x450/8B7355/FFFFFF?text=現校舎'}
                  alt={currentBuilding.name}
                  style={{
                    width: '100%',
                    maxWidth: '1000px',
                    margin: '0 auto',
                    height: 'auto',
                    aspectRatio: '16/9',
                    objectFit: 'cover',
                    border: `4px solid ${styleConfig.colorTheme.accentColor}`,
                    borderRadius: '8px',
                    display: 'block',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                  }}
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: styleConfig.colorTheme.accentColor, textAlign: 'center' }}>
                  {currentBuilding.name}
                </p>
              </div>
            )
          })()}
          <p style={{ 
            fontSize: styleConfig.typography.bodySize,
            lineHeight: '2.2',
            whiteSpace: 'pre-line',
            color: styleConfig.colorTheme.textColor,
            textIndent: '1em'
          }}>
            {data.school_profile.overview}
          </p>
        </div>
      </section>
    ),

    motto: !styleConfig.headerStyle.showMottoInHeader ? (
      <section key="motto" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '0.75rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ 校訓 ◆
        </h2>
        
        {/* 校訓表示：初代校舎（1枚のみ）＋校訓の2列構成 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '2rem',
          alignItems: 'center',
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '1rem',
          backgroundColor: 'rgba(255,255,255,0.95)',
          border: '4px solid #8B4513',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>
          {/* 初代校舎（1枚のみ） */}
          {data.school_profile.historical_buildings && data.school_profile.historical_buildings[0] && (
            <div style={{ textAlign: 'center' }}>
              <img 
                src={data.school_profile.historical_buildings[0].image_url || 'https://placehold.co/300x200/8B7355/FFFFFF?text=初代校舎'} 
                alt={data.school_profile.historical_buildings[0].name}
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  height: 'auto',
                  border: '4px solid #5D4E37',
                  borderRadius: '8px',
                  filter: 'blur(0.8px) sepia(40%) saturate(60%)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                }}
              />
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.9rem', 
                fontWeight: 'bold',
                color: '#5D4E37'
              }}>
                {data.school_profile.historical_buildings[0].name}
              </p>
            </div>
          )}
          
          {/* 校訓（フォントは日本語対応を優先して文字崩れ防止） */}
          <div style={{ 
            textAlign: 'center',
            padding: '1rem',
            minWidth: '200px'
          }}>
            {(() => {
              const char = String(data.school_profile.motto_single_char ?? '').trim()
              const isSafe = char && !/[?？\uFFFD]/.test(char) && char !== '？？？' && char !== '???'
              if (!isSafe) return null
              return (
                <div
                  style={{
                    fontSize: '6rem',
                    fontFamily: '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
                    fontWeight: 'bold',
                    color: '#8B0000',
                    textShadow: '3px 3px 6px rgba(0,0,0,0.3)',
                    marginBottom: '1rem',
                    lineHeight: '1'
                  }}
                  title={char}
                >
                  『{char}』
                </div>
              )
            })()}
            {data.school_profile.sub_catchphrase && (
              <p style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: '#2C5F2D',
                marginTop: '1rem',
                lineHeight: '1.8'
              }}>
                {data.school_profile.sub_catchphrase}
              </p>
            )}
            <p style={{ 
              fontSize: '2rem',
              fontFamily: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
              fontWeight: 'bold',
              marginTop: '1.5rem',
              color: '#8B0000',
              letterSpacing: '0.2em',
              whiteSpace: 'pre-line',
              lineHeight: '1.6'
            }}>
              {(() => {
                const m = data.school_profile.motto || ''
                if (m.length <= 14) return m
                const breaks: string[] = []
                let rest = m
                const maxLen = 14
                while (rest.length > maxLen) {
                  const chunk = rest.slice(0, maxLen)
                  const punct = /[、。・]/.exec(chunk.split('').reverse().join(''))
                  const idx = punct ? maxLen - (punct.index ?? 0) : maxLen
                  breaks.push(rest.slice(0, idx))
                  rest = rest.slice(idx)
                }
                if (rest) breaks.push(rest)
                return breaks.join('\n')
              })()}
            </p>
          </div>
        </div>
      </section>
    ) : <></>,

    // 校舎の歴史セクションは非表示（初代・現校舎の画像は概要・校訓で使用）
    historical_buildings: null,

    anthem: (
      <section key="anthem" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ♪ 校歌 ♪
        </h2>
        <div style={{ 
          border: `3px double ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: '#fdfcf0',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          backgroundImage: 'linear-gradient(45deg, #fdfcf0 25%, transparent 25%, transparent 75%, #fdfcf0 75%, #fdfcf0), linear-gradient(45deg, #fdfcf0 25%, transparent 25%, transparent 75%, #fdfcf0 75%, #fdfcf0)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '1.5rem 1.25rem',
            border: '2px solid #8B4513',
            borderRadius: '8px',
            maxWidth: '720px',
            margin: '0 auto'
          }}>
            <h3 style={{ 
              fontWeight: 'bold', 
              fontSize: '1.6rem', 
              marginBottom: '0.5rem', 
              fontFamily: calligraphyFont,
              textAlign: 'center',
              color: '#8B0000'
            }}>
              {data.school_anthem?.title}
            </h3>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#6b7280', 
              marginBottom: '1.25rem',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              〜 {data.school_anthem?.style || '荘厳な合唱曲風'} 〜
            </p>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #8B4513, transparent)', marginBottom: '1.25rem', opacity: 0.6 }} />

            {/* 校歌の再生（音声ありならプレーヤー、なしなら説明表示） */}
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '1.25rem',
              border: '2px solid #d4af37',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#8B0000' }}>
                🎵 校歌を聴く
              </p>
              {data.school_anthem?.audio_url ? (
                <>
                  {anthemAudioError && (
                    <div style={{ fontSize: '0.9rem', color: '#b91c1c', marginBottom: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                      この音声のリンクは期限切れになっている可能性があります（十数分〜20分程度で切れることがあります）。下の「音声生成を再試行」で再度生成できます。
                      {onRetryAnthemAudio && (
                        <button
                          type="button"
                          onClick={() => { setAnthemAudioError(false); onRetryAnthemAudio() }}
                          style={{
                            display: 'block',
                            marginTop: '0.5rem',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.85rem',
                            border: '2px solid #8B4513',
                            borderRadius: '6px',
                            background: '#fffef8',
                            color: '#8B4513',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          音声生成を再試行
                        </button>
                      )}
                    </div>
                  )}
                  <audio
                    ref={anthemRef}
                    controls
                    style={{ width: '100%', maxWidth: '500px' }}
                    preload="metadata"
                    onPlay={handleAnthemPlay}
                    onPause={handleAnthemPause}
                    onEnded={handleAnthemPause}
                    onError={() => setAnthemAudioError(true)}
                  >
                    <source src={data.school_anthem?.audio_url} type="audio/mpeg" />
                    お使いのブラウザは音声再生に対応していません。
                  </audio>
                </>
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    校歌の音声は生成に数分かかることがあります。準備でき次第、再生ボタンが表示されます。
                  </p>
                  {onRetryAnthemAudio && (
                    <button
                      type="button"
                      onClick={onRetryAnthemAudio}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.85rem',
                        border: '2px solid #8B4513',
                        borderRadius: '6px',
                        background: '#fffef8',
                        color: '#8B4513',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      音声生成を再試行
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 歌詞（1番・2番・3番を付けて表示） */}
            <div style={{
              backgroundColor: '#fffef8',
              padding: '1.5rem 1.25rem',
              border: '3px double #8B4513',
              borderRadius: '8px',
              boxShadow: 'inset 0 0 20px rgba(139,69,19,0.1)'
            }}>
              <p style={{ 
                fontSize: '1.2rem',
                lineHeight: '1.9',
                whiteSpace: 'pre-line',
                fontFamily: calligraphyFont,
                color: '#1a1a1a',
                textAlign: 'center',
                letterSpacing: '0.08em',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.08)'
              }}>
                {(() => {
                  const raw = data.school_anthem?.lyrics || ''
                  const byKanji = raw.split(/(?=^[一二三]\s*\n)/m).filter(Boolean)
                  const parts = byKanji.length >= 2
                    ? byKanji
                    : raw.split(/\n\n+/)
                  if (parts.length >= 2) {
                    return parts.map((p, i) => `【歌詞 ${i + 1}番】\n${p.trim()}`).join('\n\n')
                  }
                  return raw ? `【歌詞 1番】\n${raw}` : raw
                })()}
              </p>
            </div>
          </div>
        </div>
      </section>
    ),

    rules: (
      <section key="rules" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ※ 生徒心得 ※
        </h2>
        <div style={{ 
          border: `3px solid ${styleConfig.colorTheme.accentColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: '#fffacd',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            border: `2px dashed ${styleConfig.colorTheme.accentColor}`,
            borderRadius: '4px'
          }}>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(data.crazy_rules ?? []).map((rule, index) => (
                <li key={index} style={{ display: 'flex', alignItems: 'flex-start', fontSize: styleConfig.typography.bodySize }}>
                  <span style={{ 
                    fontWeight: 'bold', 
                    marginRight: '0.75rem', 
                    color: 'white',
                    backgroundColor: styleConfig.colorTheme.accentColor,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    minWidth: '2rem',
                    textAlign: 'center'
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ 
                    color: styleConfig.colorTheme.textColor,
                    lineHeight: '1.8'
                  }}>
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    ),

    events: (data.multimedia_content?.school_events ?? []).length > 0 ? (
      <section key="events" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◇ 年間行事 ◇
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(data.multimedia_content?.school_events ?? []).map((event, index) => (
              <div key={index} style={{ 
                borderBottom: index < data.multimedia_content!.school_events!.length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none',
                paddingBottom: '1rem'
              }}>
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.name}
                    style={{ 
                      width: '100%', 
                      maxWidth: '1000px',
                      margin: '0 auto',
                      height: 'auto', 
                      aspectRatio: '16/9', 
                      objectFit: 'cover', 
                      border: `4px solid ${styleConfig.colorTheme.accentColor}`, 
                      borderRadius: '8px',
                      marginBottom: '0.5rem', 
                      display: 'block',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}
                  />
                )}
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{event.date}</p>
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{event.name}</h3>
                <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '2.2', textIndent: '1em' }}>
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : <></>,

    clubs: (data.multimedia_content?.club_activities ?? []).length > 0 ? (
      <section key="clubs" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ 部活動紹介 ◆
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(data.multimedia_content?.club_activities ?? []).map((club, index) => (
              <div key={index} style={{ 
                borderBottom: index < data.multimedia_content!.club_activities!.length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none',
                paddingBottom: '1rem'
              }}>
                {club.image_url && (
                  <img
                    src={club.image_url}
                    alt={club.name}
                    style={{ 
                      width: '100%', 
                      maxWidth: '1000px',
                      margin: '0 auto',
                      height: 'auto', 
                      aspectRatio: '16/9', 
                      objectFit: 'cover', 
                      border: `4px solid ${styleConfig.colorTheme.accentColor}`, 
                      borderRadius: '8px',
                      marginBottom: '0.5rem', 
                      display: 'block',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}
                  />
                )}
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{club.name}</h3>
                <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '2.2', textIndent: '1em' }}>
                  {club.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : <></>,

    facilities: facilitiesOnlySection,
    monument: monumentSection,
    uniform: uniformSection,

    history: (data.history ?? []).length > 0 ? (
      <section key="history" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ 沿革 ◆
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <img
              src={data.school_profile?.historical_buildings?.[0]?.image_url || 'https://placehold.co/800x300/8B7355/FFFFFF?text=Historical+Photo'}
              alt="学校の歴史（初代校舎）"
              style={{ 
                width: '100%', 
                maxWidth: '1000px',
                margin: '0 auto',
                height: 'auto', 
                aspectRatio: '16/9', 
                objectFit: 'cover', 
                border: `4px solid ${styleConfig.colorTheme.accentColor}`, 
                borderRadius: '8px',
                marginBottom: '0', 
                display: 'block',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
              }}
            />
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(data.history ?? []).map((item, index) => (
              <li key={index} style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.75' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : <></>,

    teachers: (data.teachers ?? []).length > 0 ? (
      <section key="teachers" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ 教職員紹介 ◆
        </h2>
        <div style={{ 
          border: `2px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div 
            className={(data.teachers ?? []).length === 3 ? 'teachers-grid-3' : ''}
            style={{ 
              display: 'grid', 
              ...((data.teachers ?? []).length !== 3 && { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }),
              gap: styleConfig.spacing.sectionGap || '1rem' 
            }}
          >
            {(data.teachers ?? []).map((teacher, index) => (
              <div key={index} style={{ 
                border: `1px solid ${styleConfig.colorTheme.borderColor}`,
                padding: '1rem',
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                {/* 教員の写真は校長のみ（校長は principal セクションで表示） */}
                <p style={{ 
                  fontWeight: 'bold', 
                  fontSize: '1.1rem',
                  marginBottom: '0.25rem',
                  color: styleConfig.colorTheme.textColor
                }}>
                  {teacher.name}
                </p>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: '#6b7280',
                  marginBottom: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {teacher.subject}
                </p>
                <p style={{ 
                  fontSize: '0.875rem',
                  lineHeight: '1.75',
                  color: styleConfig.colorTheme.textColor
                }}>
                  {teacher.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : <></>,

    school_trip: null,
  }

  const defaultOrder = ['news', 'principal', 'overview', 'anthem', 'rules', 'events', 'clubs', 'motto', 'facilities', 'monument', 'uniform', 'history', 'teachers']
  const rawOrder = styleConfig?.sectionOrder
  const orderArray = Array.isArray(rawOrder) && rawOrder.length > 0 ? rawOrder : defaultOrder
  const normalizedOrder = (orderArray ?? []).flatMap((key: string) => {
    if (key === 'facilities_monuments_uniforms') return ['facilities', 'monument', 'uniform']
    if (key === 'facilities' || key === 'monument' || key === 'uniform') return [key]
    if (key === 'monuments') return ['monument']
    if (key === 'uniforms') return ['uniform']
    return [key]
  })
  const orderedSections = (normalizedOrder ?? []).map(key => sections[key]).filter(Boolean)

  const layoutClass = styleConfig.layout === 'single-column' 
    ? 'max-w-4xl mx-auto'
    : styleConfig.layout === 'grid'
    ? 'grid grid-cols-1 lg:grid-cols-2'
    : 'grid grid-cols-1 lg:grid-cols-3'
  const layoutGap = styleConfig.spacing.sectionGap || '0.5rem'

  return (
    <>
      {/* グローバルスタイル（背景パターン） */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .background-pattern {
          position: relative;
        }
        .background-pattern::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: repeating-linear-gradient(
            ${styleConfig.backgroundPattern?.rotation || 15}deg,
            transparent,
            transparent 100px,
            ${styleConfig.colorTheme.accentColor}10 100px,
            ${styleConfig.colorTheme.accentColor}10 101px
          );
          opacity: ${styleConfig.backgroundPattern?.opacity || 0.08};
          pointer-events: none;
          z-index: 0;
          user-select: none;
        }
        .teachers-grid-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 768px) {
          .teachers-grid-3 {
            grid-template-columns: 1fr !important;
          }
        }
        .pattern-symbol {
          position: fixed;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          font-size: ${styleConfig.backgroundPattern?.size === 'text-8xl' ? '6rem' : '4rem'};
          opacity: ${styleConfig.backgroundPattern?.opacity || 0.08};
          color: ${styleConfig.colorTheme.accentColor};
          pointer-events: none;
          z-index: 0;
          user-select: none;
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          overflow: hidden;
        }
      `}</style>

      {/* 昔のサイトっぽいダサいBGM */}
      <audio 
        ref={bgmRef}
        loop
        preload="auto"
      >
        {/* MIDI風のBGM（フリー音源）*/}
        <source src="https://www.bensound.com/bensound-music/bensound-slowmotion.mp3" type="audio/mpeg" />
      </audio>

      <div className="background-pattern" style={{ 
        minHeight: '100vh',
        backgroundColor: styleConfig.colorTheme.bgColor,
        fontFamily: styleConfig.typography.fontFamily,
        position: 'relative'
      }}>
      
      {/* 背景にリピートするシンボル（PDFで？？？になる場合はフォント未埋め込みの可能性。Noto Sans JP を優先） */}
      {styleConfig.backgroundPattern && styleConfig.backgroundPattern.symbol != null && String(styleConfig.backgroundPattern.symbol).trim() !== '' && (
        <div 
          className="pattern-symbol"
          style={{
            position: 'fixed',
            top: '-10%',
            left: '-10%',
            width: '120%',
            height: '120%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 150px)',
            gap: '3rem',
            transform: `rotate(${styleConfig.backgroundPattern.rotation}deg)`,
            zIndex: 0
          }}
        >
          {Array.from({ length: 100 }).map((_, i) => (
            <div 
              key={i}
              style={{
                fontSize: styleConfig.backgroundPattern!.size === 'text-8xl' ? '6rem' : '4rem',
                opacity: styleConfig.backgroundPattern!.opacity,
                color: styleConfig.colorTheme.accentColor,
                textAlign: 'center',
                userSelect: 'none',
                fontFamily: '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif'
              }}
            >
              {String(styleConfig.backgroundPattern!.symbol).trim()}
            </div>
          ))}
        </div>
      )}

      <header style={{ 
        background: styleConfig.colorTheme.headerBg,
        position: 'relative',
        zIndex: 1,
        color: styleConfig.colorTheme.headerText,
        padding: '0.75rem 0.75rem',
        borderBottom: '8px double gold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 流れるようこそメッセージ */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: '0.4rem 0.5rem',
            marginBottom: '0.75rem',
            border: '2px solid rgba(255,255,255,0.3)',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <div style={{
              display: 'inline-block',
              animation: 'marquee 15s linear infinite',
              fontSize: '0.85rem'
            }}>
              ★☆ ようこそ{data.school_profile.name}ホームページへ！！！ ☆★
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {/* ロゴ画像（学校名バナー） */}
            {data.school_profile?.logo_url && (
              <>
                <img 
                  src={data.school_profile.logo_url} 
                  alt={data.school_profile.name}
                  style={{ 
                    width: '100%',
                    maxWidth: '1200px', 
                    height: 'auto',
                    margin: '0 auto 0.4rem',
                    border: '4px solid gold',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    display: 'block'
                  }}
                />
                {/* ロゴがあっても学校名をテキストで表示（読みやすく） */}
                <p style={{
                  fontSize: 'clamp(2rem, 5vw + 1rem, 3.25rem)',
                  fontWeight: 900,
                  fontFamily: calligraphyFont,
                  margin: 0,
                  letterSpacing: '0.06em',
                  color: styleConfig.colorTheme.headerText,
                  textShadow: '3px 3px 6px rgba(0,0,0,0.6), 0 0 16px rgba(255,215,0,0.4)'
                }}>
                  {data.school_profile.name}
                </p>
              </>
            )}
            
            {data.school_profile?.emblem_url && (
              <img 
                src={data.school_profile.emblem_url} 
                alt="校章"
                style={{ 
                  width: 'clamp(12rem, 18vw, 16rem)',
                  height: 'clamp(12rem, 18vw, 16rem)',
                  margin: '0 auto 0.75rem',
                  border: '6px solid gold',
                  borderRadius: '50%',
                  boxShadow: '0 0 40px rgba(255,215,0,0.8), 0 8px 24px rgba(0,0,0,0.4)',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)'
                }}
              />
            )}
            
            {/* 学校名：読みやすく大きく（長い名前でも最小3rem確保） */}
            {!data.school_profile?.logo_url && (
              <h1 style={{ 
                fontSize: (data.school_profile.name.length > 14
                  ? 'clamp(2.5rem, 5vw + 1.5rem, 3.25rem)'
                  : data.school_profile.name.length > 10
                  ? 'clamp(3rem, 6vw + 1.5rem, 3.75rem)'
                  : 'clamp(3.25rem, 8vw + 1rem, 4.5rem)'),
                fontWeight: 900,
                fontFamily: calligraphyFont,
                margin: '0 0 0 0',
                letterSpacing: '0.06em',
                lineHeight: 1.3,
                maxWidth: '100%',
                overflowWrap: 'break-word',
                wordBreak: 'keep-all',
              ...(styleConfig.headerStyle.schoolNameDecoration === 'shadow' && {
                textShadow: '4px 4px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.5)'
              }),
              ...(styleConfig.headerStyle.schoolNameDecoration === 'outline' && {
                WebkitTextStroke: '3px rgba(212,175,55,0.8)',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
              }),
              ...(styleConfig.headerStyle.schoolNameDecoration === 'glow' && {
                textShadow: '0 0 20px rgba(255,215,0,1), 0 0 40px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.6), 2px 2px 4px rgba(0,0,0,0.5)'
              }),
              ...(styleConfig.headerStyle.schoolNameDecoration === 'gradient' && {
                background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))'
              }),
              ...(styleConfig.headerStyle.schoolNameDecoration === '3d' && {
                textShadow: '1px 1px 0 rgba(212,175,55,0.9), 2px 2px 0 rgba(212,175,55,0.8), 3px 3px 0 rgba(212,175,55,0.7), 4px 4px 0 rgba(212,175,55,0.6), 5px 5px 0 rgba(212,175,55,0.5), 6px 6px 10px rgba(0,0,0,0.5)'
              })
              }}>
                {data.school_profile.name}
              </h1>
            )}

            {/* タイトル下の帯（キャッチフレーズ・創立） */}
            <div style={{
              marginTop: '0.6rem',
              marginBottom: styleConfig.headerStyle.showMottoInHeader ? '0.75rem' : '0.5rem',
              width: '100%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.35) 15%, rgba(255,215,0,0.5) 50%, rgba(255,215,0,0.35) 85%, transparent 100%)',
              borderTop: '3px solid rgba(255,255,255,0.6)',
              borderBottom: '3px solid rgba(255,255,255,0.6)',
              padding: '0.5rem 1rem',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <p style={{
                margin: 0,
                fontSize: 'clamp(0.95rem, 2vw + 0.5rem, 1.15rem)',
                fontWeight: 'bold',
                letterSpacing: '0.2em',
                color: 'rgba(255,255,255,0.98)',
                textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
              }}>
                {data.school_profile.sub_catchphrase || `${data.school_profile.name} 公式ホームページ`}
                {data.school_profile.established && (
                  <span style={{ marginLeft: '0.75rem', opacity: 0.95, fontWeight: 600 }}>
                    創立 {data.school_profile.established}
                  </span>
                )}
              </p>
            </div>
            
            {/* 校訓（ヘッダーに表示。空・？だけのときは表示しないで？？？を防ぐ） */}
            {styleConfig.headerStyle.showMottoInHeader && (() => {
              const motto = (data.school_profile.motto || '').trim()
              const isBlankOrPlaceholder = !motto || /^[?？\s\uFFFD]*$/.test(motto) || motto === '？？？' || motto === '???'
              if (isBlankOrPlaceholder) return null
              return (
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  color: '#8B0000',
                  padding: '0.75rem 1rem',
                  margin: '0.4rem auto 0',
                  maxWidth: '900px',
                  border: '6px double #8B0000',
                  borderRadius: '8px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 0 24px rgba(139,0,0,0.12)'
                }}>
                  <p style={{
                    fontSize: '3rem',
                    fontFamily: '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
                    fontWeight: 'bold',
                    lineHeight: '1.6',
                    letterSpacing: '0.15em',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                    background: 'linear-gradient(180deg, #8B0000 0%, #DC143C 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {motto}
                  </p>
                </div>
              )
            })()}

          </div>
        </div>

        {/* marqueeアニメーション */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}} />
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.5rem 0.75rem', position: 'relative', zIndex: 1 }}>
        {styleConfig.layout === 'two-column' ? (
          <div className={layoutClass} style={{ gap: layoutGap }}>
            <div style={{ gridColumn: 'span 2 / span 2' }}>
              {orderedSections}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: layoutGap }}>
              {data.access && (
                <div style={{ 
                  border: `1px solid ${styleConfig.colorTheme.borderColor}`,
                  padding: styleConfig.spacing.cardPadding,
                  backgroundColor: styleConfig.colorTheme.cardBg
                }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: styleConfig.colorTheme.accentColor }}>アクセス</h3>
                  <p style={{ 
                    fontSize: '0.75rem',
                    color: styleConfig.colorTheme.textColor,
                    lineHeight: '1.75',
                    whiteSpace: 'pre-line'
                  }}>
                    {data.access}
                  </p>
                </div>
              )}

              {data.notable_alumni && data.notable_alumni.length > 0 && (
                <div style={{ 
                  border: `1px solid ${styleConfig.colorTheme.borderColor}`,
                  padding: styleConfig.spacing.cardPadding,
                  backgroundColor: styleConfig.colorTheme.cardBg
                }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: styleConfig.colorTheme.accentColor }}>著名な卒業生</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(data.notable_alumni ?? []).map((alumni, index) => (
                      <div key={index} style={{ fontSize: '0.75rem' }}>
                        <p style={{ fontWeight: 'bold' }}>{alumni.name}</p>
                        <p style={{ color: '#6b7280' }}>{alumni.year}</p>
                        <p style={{ color: styleConfig.colorTheme.textColor, marginTop: '0.25rem' }}>{alumni.achievement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.teachers && data.teachers.length > 0 && (
                <div style={{ 
                  border: `1px solid ${styleConfig.colorTheme.borderColor}`,
                  padding: styleConfig.spacing.cardPadding,
                  backgroundColor: styleConfig.colorTheme.cardBg
                }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: styleConfig.colorTheme.accentColor }}>教職員紹介</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(data.teachers ?? []).map((teacher, index) => (
                      <div key={index} style={{ fontSize: '0.75rem' }}>
                        <p style={{ fontWeight: 'bold' }}>
                          {teacher.name} <span style={{ color: '#6b7280' }}>({teacher.subject})</span>
                        </p>
                        <p style={{ color: styleConfig.colorTheme.textColor }}>{teacher.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ 
                border: `3px solid ${styleConfig.colorTheme.borderColor}`,
                padding: styleConfig.spacing.cardPadding,
                backgroundColor: styleConfig.colorTheme.cardBg,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '0.75rem', 
                  color: 'white',
                  backgroundColor: styleConfig.colorTheme.accentColor,
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontSize: '0.9rem'
                }}>
                  ◆ 関連リンク ◆
                </h3>
                <ul style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li style={{ borderLeft: `3px solid ${styleConfig.colorTheme.accentColor}`, paddingLeft: '0.5rem' }}>
                    <a href="#" style={{ color: styleConfig.colorTheme.accentColor, textDecoration: 'underline' }}>→ 文部科学省</a>
                  </li>
                  <li style={{ borderLeft: `3px solid ${styleConfig.colorTheme.accentColor}`, paddingLeft: '0.5rem' }}>
                    <a href="#" style={{ color: styleConfig.colorTheme.accentColor, textDecoration: 'underline' }}>→ 都道府県教育委員会</a>
                  </li>
                  <li style={{ borderLeft: `3px solid ${styleConfig.colorTheme.accentColor}`, paddingLeft: '0.5rem' }}>
                    <a href="#" style={{ color: styleConfig.colorTheme.accentColor, textDecoration: 'underline' }}>→ PTA連絡会</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className={layoutClass} style={{ gap: layoutGap }}>
            {orderedSections}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button
            onClick={onReset}
            style={{
              background: 'linear-gradient(180deg, #f0f0f0 0%, #d0d0d0 100%)',
              border: '3px outset #999',
              padding: '0.75rem 2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '3px 3px 6px rgba(0,0,0,0.3)',
              fontSize: '0.9rem',
              borderRadius: '4px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.borderStyle = 'inset'
              e.currentTarget.style.transform = 'translateY(2px)'
              e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.3)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.borderStyle = 'outset'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.3)'
            }}
          >
            🗺️ 別の場所で生成する
          </button>
        </div>
      </div>

      <footer style={{ 
        textAlign: 'center',
        padding: '1rem 0.75rem',
        fontSize: '0.75rem',
        color: '#6b7280',
        borderTop: `4px double ${styleConfig.colorTheme.borderColor}`,
        marginTop: '1rem',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          marginBottom: '1rem',
          padding: '0.5rem',
          backgroundColor: 'white',
          border: '2px solid #d1d5db',
          display: 'inline-block',
          borderRadius: '4px'
        }}>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginRight: '0.5rem' }}>
            あなたは
          </span>
          <span style={{ 
            fontFamily: 'monospace',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#dc2626',
            padding: '0.25rem 0.5rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #dc2626'
          }}>
            {Math.floor(Math.random() * 999999).toString().padStart(6, '0')}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: '0.5rem' }}>
            人目の訪問者です！！！
          </span>
        </div>
        <p style={{ marginBottom: '0.5rem' }}>© 2026 {data.school_profile.name} All Rights Reserved.</p>
        <p style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
          ※このサイトの内容を無断で転載することを禁じます※
        </p>
      </footer>
    </div>
    </>
  )
}
