import { NextRequest, NextResponse } from 'next/server'
import { addStar } from '@/lib/archive'

/** POST /api/school/[id]/star - 星を1つ追加（誰でも可能） */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const stars = await addStar(id)
    return NextResponse.json({ stars })
  } catch (err) {
    console.error('star error', { id, err })
    return NextResponse.json({ error: 'Failed to add star' }, { status: 500 })
  }
}
