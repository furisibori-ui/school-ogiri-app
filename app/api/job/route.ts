import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

/**
 * ジョブ状態のポーリング用 GET /api/job?jobId=xxx
 * - status: 'pending' | 'running' | 'completed' | 'partial' | 'failed'
 * - completed 時は data に学校データを返す
 * - failed 時は error にメッセージを返す（Inngest が失敗した時点でフロントがエラー表示できるように）
 * - partial=1 かつ running のとき、途中保存があれば status: 'partial', data で返す（タイムアウト直前の表示用）
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  const wantPartial = request.nextUrl.searchParams.get('partial') === '1'
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  try {
    const status = await kv.get<string>(`school:${jobId}:status`)
    if (status === 'failed') {
      const errorMsg = await kv.get<string>(`school:${jobId}:error`)
      return NextResponse.json({
        status: 'failed',
        error: errorMsg || '処理に失敗しました。しばらく経ってから再度お試しください。',
      })
    }
    if (status === 'completed') {
      const data = await kv.get<string>(`school:${jobId}`)
      if (data !== null && data !== undefined) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data
        return NextResponse.json({ status: 'completed', data: parsed })
      }
    }

    if (status === 'running' && wantPartial) {
      const partial = await kv.get<string>(`school:${jobId}:partial`)
      if (partial !== null && partial !== undefined) {
        const parsed = typeof partial === 'string' ? JSON.parse(partial) : partial
        return NextResponse.json({ status: 'partial', data: parsed })
      }
    }

    return NextResponse.json({
      status: status === undefined ? 'pending' : status,
    })
  } catch (err) {
    console.error('job status error', { jobId, err })
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}
