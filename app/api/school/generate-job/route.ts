import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import type { LocationData } from '@/types/school'

const EVENT_NAME = 'school/generate'

/**
 * 学校生成ジョブを開始する。Inngest にイベントを送り、即座に jobId を返す。
 * フロントは jobId で GET /api/job?jobId=xxx をポーリングして完了＋データを取得する。
 */
export async function POST(request: NextRequest) {
  let locationData: LocationData
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'リクエストデータがありません', jobId: null },
        { status: 400 }
      )
    }
    locationData = body as LocationData
    const lat = locationData.lat
    const lng = locationData.lng
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: '位置情報（緯度・経度）が不正です', jobId: null },
        { status: 400 }
      )
    }
    locationData.lat = lat
    locationData.lng = lng
    locationData.address = locationData.address ?? `緯度${lat.toFixed(4)}, 経度${lng.toFixed(4)}`
    locationData.landmarks = locationData.landmarks?.length ? locationData.landmarks : ['この地域']
  } catch (parseErr) {
    console.error('generate-job リクエスト解析エラー:', parseErr)
    return NextResponse.json(
      { error: 'リクエストの形式が不正です', jobId: null },
      { status: 400 }
    )
  }

  const jobId = `school-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  try {
    await inngest.send({
      name: EVENT_NAME,
      data: { jobId, location: locationData },
    })
    console.log('Inngest event sent', { jobId, name: EVENT_NAME })
    return NextResponse.json({ jobId })
  } catch (err) {
    console.error('Inngest send error', err)
    return NextResponse.json(
      { error: 'ジョブの開始に失敗しました', jobId: null },
      { status: 500 }
    )
  }
}
