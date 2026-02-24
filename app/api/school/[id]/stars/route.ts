import { NextRequest, NextResponse } from 'next/server'
import { getStarCount } from '@/lib/archive'

/** GET /api/school/[id]/stars - 星の数を取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const stars = await getStarCount(id)
    return NextResponse.json({ stars })
  } catch (err) {
    console.error('stars get error', { id, err })
    return NextResponse.json({ error: 'Failed to get stars' }, { status: 500 })
  }
}
