import { NextResponse } from 'next/server'
import { getArchiveList } from '@/lib/archive'

/** GET /api/archive - アーカイブ一覧（星の数でソート） */
export async function GET() {
  try {
    const list = await getArchiveList()
    return NextResponse.json({ items: list })
  } catch (err) {
    console.error('archive list error', err)
    return NextResponse.json({ error: 'Failed to load archive' }, { status: 500 })
  }
}
