'use client'

import { useState, useEffect } from 'react'

interface SchoolPageActionsProps {
  id: string
  initialStars?: number
}

export default function SchoolPageActions({ id, initialStars = 0 }: SchoolPageActionsProps) {
  const [stars, setStars] = useState(initialStars)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/school/${id}/stars`)
      .then((r) => r.json())
      .then((body) => {
        if (typeof body.stars === 'number') setStars(body.stars)
      })
      .catch(() => {})
  }, [id])

  const handleStar = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/school/${id}/star`, { method: 'POST' })
      const data = await res.json()
      if (data.stars !== undefined) setStars(data.stars)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この学校を削除しますか？削除すると元に戻せません。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/school/${id}/delete`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/archive'
      } else {
        alert('削除に失敗しました')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginTop: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        onClick={handleStar}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.8)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        ★ {stars} つ星 {loading ? '...' : '(押して追加)'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'transparent',
          border: '2px solid rgba(255,255,255,0.6)',
          color: 'rgba(255,255,255,0.9)',
          borderRadius: '8px',
          fontSize: '0.9rem',
          cursor: deleting ? 'not-allowed' : 'pointer',
        }}
      >
        {deleting ? '削除中...' : '削除'}
      </button>
    </div>
  )
}
