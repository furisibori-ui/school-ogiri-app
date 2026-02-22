import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

/**
 * ジョブ状態のポーリング用 GET /api/job?jobId=xxx
 * - status: 'pending' | 'running' | 'completed'
 * - completed 時は data に学校データを返す
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  try {
    const status = await kv.get<string>(`school:${jobId}:status`)
    if (status !== 'completed') {
      return NextResponse.json({
        status: status === undefined ? 'pending' : status,
      })
    }

    const data = await kv.get<string>(`school:${jobId}`)
    if (data === null || data === undefined) {
      return NextResponse.json({ status: 'pending' })
    }

    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    return NextResponse.json({ status: 'completed', data: parsed })
  } catch (err) {
    console.error('job status error', { jobId, err })
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}
