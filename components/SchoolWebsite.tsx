'use client'

import { SchoolData } from '@/types/school'

interface SchoolWebsiteProps {
  data: SchoolData
  onReset: () => void
}

export default function SchoolWebsite({ data, onReset }: SchoolWebsiteProps) {
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
      titleSize: '3.5rem',
      headingSize: '2rem',
      bodySize: '1rem',
      fontFamily: '"Noto Serif JP", serif'
    },
    spacing: {
      sectionGap: '2rem',
      cardPadding: '1.5rem'
    },
    sectionOrder: []
  }

  // 筆文字フォント（楷書体風）
  const calligraphyFont = 'var(--font-yuji-mai), "HGS行書体", "AR行書体M", cursive'

  const sections: { [key: string]: JSX.Element } = {
    news: data.news_feed && data.news_feed.length > 0 ? (
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
          {data.news_feed.map((news, index) => (
            <div key={index} style={{ 
              padding: '0.75rem 1rem',
              borderBottom: index < data.news_feed.length - 1 ? `2px dotted ${styleConfig.colorTheme.borderColor}` : 'none',
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

    principal: (
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
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {data.principal_message?.face_image_url && (
              <div style={{ display: 'inline-block' }}>
                <img
                  src={data.principal_message.face_image_url}
                  alt={data.principal_message.name}
                  style={{ 
                    width: '16rem', 
                    height: '16rem', 
                    objectFit: 'cover', 
                    border: `5px solid ${styleConfig.colorTheme.accentColor}`,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    marginBottom: '1rem'
                  }}
                />
                <div style={{
                  backgroundColor: styleConfig.colorTheme.accentColor,
                  color: 'white',
                  padding: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '1.25rem',
                  border: '3px solid gold'
                }}>
                  {data.principal_message.name} {data.principal_message.title}
                </div>
              </div>
            )}
          </div>
          <div style={{
            backgroundColor: '#fffef0',
            padding: '1.5rem',
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
              {data.principal_message.text}
            </p>
          </div>
        </div>
      </section>
    ),

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
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '2rem',
            border: '2px solid #8B4513',
            borderRadius: '8px'
          }}>
            <h3 style={{ 
              fontWeight: 'bold', 
              fontSize: '1.5rem', 
              marginBottom: '0.75rem', 
              fontFamily: calligraphyFont,
              textAlign: 'center',
              color: '#8B0000'
            }}>
              {data.school_anthem.title}
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280', 
              marginBottom: '1.5rem',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              〜 {data.school_anthem.style} 〜
            </p>
            {/* 音声プレーヤー */}
            {data.school_anthem.audio_url && (
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1rem',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <p style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem',
                  color: '#8B0000'
                }}>
                  🎵 校歌を聴く
                </p>
                <audio 
                  controls 
                  style={{ width: '100%', maxWidth: '500px' }}
                  preload="metadata"
                >
                  <source src={data.school_anthem.audio_url} type="audio/mpeg" />
                  お使いのブラウザは音声再生に対応していません。
                </audio>
              </div>
            )}

            <div style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}>
              <p style={{ 
                fontSize: '1.1rem',
                lineHeight: '2.5',
                whiteSpace: 'pre-line',
                fontFamily: calligraphyFont,
                color: '#1a1a1a',
                textAlign: 'center',
                letterSpacing: '0.1em'
              }}>
                {data.school_anthem.lyrics}
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
              {data.crazy_rules.map((rule, index) => (
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

    events: data.multimedia_content?.school_events && data.multimedia_content.school_events.length > 0 ? (
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
            {data.multimedia_content.school_events.map((event, index) => (
              <div key={index} style={{ 
                borderBottom: index < data.multimedia_content!.school_events!.length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none',
                paddingBottom: '1rem'
              }}>
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.name}
                    style={{ width: '100%', height: '12rem', objectFit: 'cover', border: `1px solid ${styleConfig.colorTheme.borderColor}`, marginBottom: '0.75rem' }}
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

    clubs: data.multimedia_content?.club_activities && data.multimedia_content.club_activities.length > 0 ? (
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
            {data.multimedia_content.club_activities.map((club, index) => (
              <div key={index} style={{ 
                borderBottom: index < data.multimedia_content!.club_activities!.length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none',
                paddingBottom: '1rem'
              }}>
                {club.image_url && (
                  <img
                    src={club.image_url}
                    alt={club.name}
                    style={{ width: '100%', height: '12rem', objectFit: 'cover', border: `1px solid ${styleConfig.colorTheme.borderColor}`, marginBottom: '0.75rem' }}
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

    facilities: data.multimedia_content?.facilities && data.multimedia_content.facilities.length > 0 ? (
      <section key="facilities" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◇ 施設紹介 ◇
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.multimedia_content.facilities.map((facility, index) => (
              <div key={index} style={{ 
                borderBottom: index < data.multimedia_content!.facilities!.length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none',
                paddingBottom: '1rem'
              }}>
                {facility.image_url && (
                  <img
                    src={facility.image_url}
                    alt={facility.name}
                    style={{ width: '100%', height: '12rem', objectFit: 'cover', border: `1px solid ${styleConfig.colorTheme.borderColor}`, marginBottom: '0.75rem' }}
                  />
                )}
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{facility.name}</h3>
                <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.75' }}>
                  {facility.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : <></>,

    monuments: data.multimedia_content?.monuments && data.multimedia_content.monuments.length > 0 ? (
      <section key="monuments" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ モニュメント ◆
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.multimedia_content.monuments.map((monument, index) => (
              <div key={index} style={{ 
                borderBottom: index < data.multimedia_content!.monuments!.length - 1 ? `1px solid ${styleConfig.colorTheme.borderColor}` : 'none',
                paddingBottom: '1rem'
              }}>
                {monument.image_url && (
                  <img
                    src={monument.image_url}
                    alt={monument.name}
                    style={{ width: '100%', height: '16rem', objectFit: 'cover', border: `1px solid ${styleConfig.colorTheme.borderColor}`, marginBottom: '0.75rem' }}
                  />
                )}
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{monument.name}</h3>
                <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.75' }}>
                  {monument.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : <></>,

    uniforms: data.multimedia_content?.uniforms && data.multimedia_content.uniforms.length > 0 ? (
      <section key="uniforms" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◇ 制服紹介 ◇
        </h2>
        <div style={{ 
          border: `1px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {data.multimedia_content.uniforms.map((uniform, index) => (
              <div key={index} style={{ border: `1px solid ${styleConfig.colorTheme.borderColor}`, padding: '1rem' }}>
                {uniform.image_url && (
                  <img
                    src={uniform.image_url}
                    alt={uniform.type}
                    style={{ width: '100%', height: '16rem', objectFit: 'cover', border: `1px solid ${styleConfig.colorTheme.borderColor}`, marginBottom: '0.75rem' }}
                  />
                )}
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{uniform.type}</h3>
                <p style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.75' }}>
                  {uniform.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : <></>,

    history: data.history && data.history.length > 0 ? (
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
              src="https://placehold.co/800x300/8B7355/FFFFFF?text=Historical+Photo"
              alt="学校の歴史"
              style={{ width: '100%', height: '12rem', objectFit: 'cover', border: `1px solid ${styleConfig.colorTheme.borderColor}`, marginBottom: '0.75rem' }}
            />
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.history.map((item, index) => (
              <li key={index} style={{ fontSize: styleConfig.typography.bodySize, color: styleConfig.colorTheme.textColor, lineHeight: '1.75' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : <></>,

    teachers: data.teachers && data.teachers.length > 0 ? (
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {data.teachers.map((teacher, index) => (
              <div key={index} style={{ 
                border: `1px solid ${styleConfig.colorTheme.borderColor}`,
                padding: '1rem',
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                {teacher.face_image_url && (
                  <img
                    src={teacher.face_image_url}
                    alt={teacher.name}
                    style={{ 
                      width: '200px', 
                      height: '200px', 
                      objectFit: 'cover', 
                      border: `4px solid ${styleConfig.colorTheme.accentColor}`,
                      marginBottom: '0.75rem',
                      borderRadius: '4px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                    }}
                  />
                )}
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

    school_trip: data.school_trip ? (
      <section key="school_trip" style={{ marginBottom: styleConfig.spacing.sectionGap }}>
        <h2 style={{ 
          fontSize: styleConfig.typography.headingSize,
          color: styleConfig.colorTheme.accentColor,
          borderBottom: `3px solid ${styleConfig.colorTheme.accentColor}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          fontFamily: styleConfig.typography.fontFamily,
          textAlign: 'center'
        }}>
          ◆ 修学旅行 ◆
        </h2>
        <div style={{ 
          border: `2px solid ${styleConfig.colorTheme.borderColor}`,
          padding: styleConfig.spacing.cardPadding,
          backgroundColor: styleConfig.colorTheme.cardBg
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: styleConfig.colorTheme.accentColor,
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}>
              {data.school_trip.destination}方面
            </h3>
            <p style={{ 
              fontSize: styleConfig.typography.bodySize,
              lineHeight: '2',
              color: styleConfig.colorTheme.textColor,
              marginBottom: '1.5rem',
              whiteSpace: 'pre-line'
            }}>
              {data.school_trip.description}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1rem',
            border: `1px solid ${styleConfig.colorTheme.borderColor}`,
            borderRadius: '4px'
          }}>
            <h4 style={{ 
              fontWeight: 'bold',
              fontSize: '1.1rem',
              marginBottom: '0.75rem',
              color: styleConfig.colorTheme.textColor
            }}>
              主な活動内容
            </h4>
            <ul style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              paddingLeft: '1.5rem'
            }}>
              {data.school_trip.activities.map((activity, index) => (
                <li key={index} style={{ 
                  fontSize: styleConfig.typography.bodySize,
                  lineHeight: '1.75',
                  color: styleConfig.colorTheme.textColor
                }}>
                  {activity}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    ) : <></>
  }

  const orderedSections = styleConfig.sectionOrder.length > 0 
    ? styleConfig.sectionOrder.map(key => sections[key]).filter(Boolean)
    : Object.values(sections)

  const layoutClass = styleConfig.layout === 'single-column' 
    ? 'max-w-4xl mx-auto'
    : styleConfig.layout === 'grid'
    ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
    : 'grid grid-cols-1 lg:grid-cols-3 gap-6'

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: styleConfig.colorTheme.bgColor,
      fontFamily: styleConfig.typography.fontFamily
    }}>
      <header style={{ 
        background: styleConfig.colorTheme.headerBg,
        color: styleConfig.colorTheme.headerText,
        padding: '2rem 1rem',
        borderBottom: '8px double gold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 流れるようこそメッセージ */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '2px solid rgba(255,255,255,0.3)',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            <div style={{
              display: 'inline-block',
              animation: 'marquee 15s linear infinite',
              fontSize: '0.9rem'
            }}>
              ★☆ ようこそ{data.school_profile.name}ホームページへ！！！ ☆★
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {data.school_profile?.emblem_url && (
              <img 
                src={data.school_profile.emblem_url} 
                alt="校章"
                style={{ 
                  width: '7rem', 
                  height: '7rem', 
                  margin: '0 auto 1rem',
                  border: '4px solid gold',
                  borderRadius: '50%',
                  boxShadow: '0 0 20px rgba(255,215,0,0.5)'
                }}
              />
            )}
            <h1 style={{ 
              fontSize: styleConfig.typography.titleSize,
              fontWeight: 'bold',
              fontFamily: styleConfig.typography.fontFamily,
              marginBottom: '1rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              {data.school_profile.name}
            </h1>
            
            {/* 巨大な校訓（筆文字） */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#8B0000',
              padding: '2rem 1rem',
              margin: '1rem auto',
              maxWidth: '800px',
              border: '6px double #8B0000',
              borderRadius: '8px',
              boxShadow: 'inset 0 0 20px rgba(139,0,0,0.2)'
            }}>
              <p style={{ 
                fontSize: '2.5rem',
                fontFamily: calligraphyFont,
                fontWeight: 'bold',
                lineHeight: '1.5',
                letterSpacing: '0.1em',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
              }}>
                {data.school_profile.motto}
              </p>
            </div>

            {data.school_profile.established && (
              <p style={{ 
                fontSize: '0.875rem', 
                marginTop: '0.5rem', 
                opacity: 0.85,
                backgroundColor: 'rgba(0,0,0,0.2)',
                display: 'inline-block',
                padding: '0.25rem 1rem',
                borderRadius: '4px'
              }}>
                創立 {data.school_profile.established}
              </p>
            )}
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {styleConfig.layout === 'two-column' ? (
          <div className={layoutClass}>
            <div style={{ gridColumn: 'span 2 / span 2' }}>
              {orderedSections}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: styleConfig.spacing.sectionGap }}>
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
                    {data.notable_alumni.map((alumni, index) => (
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
                    {data.teachers.map((teacher, index) => (
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
          <div className={layoutClass}>
            {orderedSections}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
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
        padding: '2rem 1rem',
        fontSize: '0.75rem',
        color: '#6b7280',
        borderTop: `4px double ${styleConfig.colorTheme.borderColor}`,
        marginTop: '2rem',
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
  )
}
