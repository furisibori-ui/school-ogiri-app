'use client'

import { useState } from 'react'
import Link from 'next/link'

const ENV_TEMPLATE = `# ============================================
# 架空学校サイト - 環境変数 一覧
# ============================================
# 以下をコピーし、プロジェクト直下に .env.local を作成して貼り付けてください。
# 値を入力したら保存し、開発サーバーを再起動 (npm run dev) してください。
# ============================================

# --- 必須：地図（Google Maps） ---
# https://console.cloud.google.com/ → APIとサービス → 認証情報
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# --- 必須：テキスト生成（Claude） ---
# https://console.anthropic.com/ → API Keys
ANTHROPIC_API_KEY=

# --- 画像生成（Replicate）※未設定ならプレースホルダー表示 ---
# https://replicate.com/ → Account → API tokens
REPLICATE_API_TOKEN=

# --- 楽曲生成（Suno / CometAPI）※未設定なら校歌は歌詞のみ ---
# https://www.cometapi.com/ → API Keys（要チャージ）
COMET_API_KEY=

# --- 本番デプロイ時のみ（VercelのURL） ---
# 画像・楽曲を本番で生成する場合のみ設定
# NEXT_PUBLIC_BASE_URL=https://あなたのアプリ.vercel.app
`

export default function SettingsPage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ENV_TEMPLATE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '2rem',
      fontFamily: '"Noto Sans JP", sans-serif'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" style={{ color: '#0369a1', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
          ← トップへ戻る
        </Link>

        <h1 style={{ fontSize: '1.5rem', color: '#0c4a6e', marginBottom: '0.5rem' }}>
          API 一括設定
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          以下のテンプレートをコピーし、<strong>プロジェクト直下に .env.local</strong> を作成して貼り付けてください。各キーを取得して値を入力し、保存後に <code>npm run dev</code> を再起動してください。
        </p>

        <div style={{
          background: '#1e293b',
          color: '#e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          overflow: 'auto',
          position: 'relative'
        }}>
          <pre style={{
            margin: 0,
            fontSize: '0.8rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'ui-monospace, monospace'
          }}>
            {ENV_TEMPLATE}
          </pre>
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              padding: '0.5rem 1rem',
              background: copied ? '#22c55e' : '#0369a1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            {copied ? 'コピーしました' : 'テンプレートをコピー'}
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#475569' }}>
          <h2 style={{ fontSize: '1rem', color: '#0c4a6e', marginBottom: '0.5rem' }}>取得先リンク</h2>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li><strong>Google Maps</strong>: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1' }}>Google Cloud Console</a></li>
            <li><strong>Anthropic (Claude)</strong>: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1' }}>Anthropic Console</a></li>
            <li><strong>Replicate（画像）</strong>: <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1' }}>Replicate API tokens</a></li>
            <li><strong>CometAPI（楽曲）</strong>: <a href="https://www.cometapi.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1' }}>CometAPI</a>（要チャージ）</li>
          </ul>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
          Vercel にデプロイする場合は、ダッシュボードの Settings → Environment Variables に上記の変数を同じ名前で追加してください。
        </p>
      </div>
    </div>
  )
}
