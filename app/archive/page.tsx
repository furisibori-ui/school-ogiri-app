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
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f0', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '2rem',
            fontFamily: 'var(--font-shippori), "Shippori Mincho", serif',
            color: '#1e3a8a',
          }}
        >
          ★ 学校アーカイブ ★
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: '#6b7280',
            marginBottom: '1rem',
            fontSize: '0.95rem',
          }}
        >
          星が多い順に表示されています。気に入った学校に星をつけてください！
        </p>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link
            href="/create"
            style={{
              fontSize: '0.9rem',
              color: '#2563eb',
              textDecoration: 'underline',
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
              color: '#6b7280',
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '2px dashed #d1d5db',
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
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e3a8a' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
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
                    backgroundColor: '#fef3c7',
                    border: '2px solid #f59e0b',
                    color: '#92400e',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ★ +1
                </button>
                <Link
                  href={`/school/${item.id}`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  見る
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.name)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
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
