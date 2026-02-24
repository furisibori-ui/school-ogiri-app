import { notFound } from 'next/navigation'
import { kv } from '@vercel/kv'
import type { Metadata } from 'next'
import Link from 'next/link'
import SharePageClient from './SharePageClient'
import SchoolPageActions from './SchoolPageActions'
import { getThumbnailUrl, getStarCount } from '@/lib/archive'
import type { SchoolData } from '@/types/school'


export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const raw = await kv.get<string>(`school:${id}`)
  if (!raw) return { title: '学校が見つかりません' }

  const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as SchoolData
  const schoolName = data?.school_profile?.name ?? '架空の学校'
  const description = data?.school_profile?.sub_catchphrase ?? data?.school_profile?.overview?.slice(0, 120) ?? '位置情報連動型・架空学校生成サイトで作成した学校'
  const thumbnail = getThumbnailUrl(data)

  return {
    title: `${schoolName} | 架空学校サイト`,
    description,
    openGraph: {
      title: schoolName,
      description,
      type: 'website',
      ...(thumbnail && {
        images: [{ url: thumbnail, width: 1200, height: 630, alt: schoolName }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: schoolName,
      description,
      ...(thumbnail && { images: [thumbnail] }),
    },
  }
}

export default async function SchoolSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const raw = await kv.get<string>(`school:${id}`)
  if (!raw) notFound()

  const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as SchoolData
  if (!data?.school_profile) notFound()

  const schoolName = data.school_profile.name
  const thumbnail = getThumbnailUrl(data)
  const initialStars = await getStarCount(id)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#e5e2dc' }}>
      {/* 共有ページ用ヘッダー: 学校名を大きく、サムネイルを表示 */}
      <header
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
          color: '#fff',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          {thumbnail && (
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }}
            >
              <img
                src={thumbnail}
                alt={`${schoolName}の校章`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 600,
              margin: 0,
              fontFamily: 'var(--font-shippori), "Shippori Mincho", "Noto Serif JP", serif',
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
              lineHeight: 1.4,
              letterSpacing: '0.08em',
            }}
          >
            {schoolName}
          </h1>
          {data.school_profile.sub_catchphrase && (
            <p
              style={{
                fontSize: '1rem',
                opacity: 0.9,
                margin: 0,
                fontFamily: 'var(--font-noto-serif), "Noto Serif JP", serif',
                letterSpacing: '0.04em',
              }}
            >
              {data.school_profile.sub_catchphrase}
            </p>
          )}
          <SchoolPageActions id={id} initialStars={initialStars} />
          <Link
            href="/archive"
            style={{
              marginTop: '0.5rem',
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.9)',
              textDecoration: 'underline',
            }}
          >
            ← アーカイブ一覧に戻る
          </Link>
        </div>
      </header>

      <main>
        <SharePageClient data={data} />
      </main>
    </div>
  )
}
