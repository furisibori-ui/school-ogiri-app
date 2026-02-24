'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ArchiveItem {
  id: string
  name: string
  thumbnail?: string
  createdAt: number
  stars: number
}

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/archive')
      .then((r) => r.json())
      .then((body) => {
        if (body.items) setItems(body.items)
        else setError(body.error || '読み込みに失敗しました')
      })
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const handleStar = async (id: string) => {
    const res = await fetch(`/api/school/${id}/star`, { method: 'POST' })
    const data = await res.json()
    if (data.stars !== undefined) {
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, stars: data.stars } : x)).sort((a, b) => b.stars - a.stars)
      )
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    const res = await fetch(`/api/school/${id}/delete`, { method: 'DELETE' })
    if (!res.ok) {
      alert('削除に失敗しました')
      return
    }
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#e5e2dc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '2rem',
            fontFamily: 'var(--font-shippori), "Shippori Mincho", "Noto Serif JP", serif',
            color: '#1a1a2e',
            letterSpacing: '0.12em',
          }}
        >
          学校アーカイブ
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: '#5c5c5c',
            marginBottom: '1rem',
            fontSize: '0.95rem',
            fontFamily: 'var(--font-noto-serif), "Noto Serif JP", serif',
          }}
        >
          星が多い順に表示されています。気に入った学校に星をつけてください！
        </p>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link
            href="/create"
            style={{
              fontSize: '0.9rem',
              color: '#4a5568',
              textDecoration: 'underline',
              fontFamily: 'var(--font-noto-serif), serif',
            }}
          >
            新しい学校を生成する（API消費あり）
          </Link>
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            読み込み中...
          </div>
        )}

        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#5c5c5c',
              backgroundColor: '#faf9f7',
              borderRadius: '8px',
              border: '1px dashed #c9c4bc',
              fontFamily: 'var(--font-noto-serif), serif',
            }}
          >
            まだアーカイブに学校がありません。
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item) => (
            <div
              key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              backgroundColor: '#faf9f7',
              borderRadius: '8px',
              border: '1px solid #d4cfc7',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
            >
              <Link
                href={`/school/${item.id}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                {item.thumbnail ? (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '2px solid #e5e7eb',
                    }}
                  >
                    <img
                      src={item.thumbnail}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    🏫
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1a1a2e', fontFamily: 'var(--font-shippori), "Shippori Mincho", serif' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#5c5c5c', marginTop: '0.25rem', fontFamily: 'var(--font-noto-serif), serif' }}>
                    ★ {item.stars} つ星
                  </div>
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleStar(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#f5f0e8',
                    border: '1px solid #c9b896',
                    color: '#6b5b3a',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-noto-serif), serif',
                  }}
                >
                  ★ +1
                </button>
                <Link
                  href={`/school/${item.id}`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#1e3a8a',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    fontFamily: 'var(--font-noto-serif), serif',
                  }}
                >
                  見る
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.name)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color: '#7f5c4a',
                    border: '1px solid #c9b896',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-noto-serif), serif',
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
