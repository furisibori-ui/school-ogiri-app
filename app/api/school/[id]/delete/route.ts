import { NextRequest, NextResponse } from 'next/server'
import { removeFromArchive } from '@/lib/archive'

/** DELETE /api/school/[id]/delete - 学校をアーカイブから削除 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const removed = await removeFromArchive(id)
    if (!removed) return NextResponse.json({ error: 'Not found in archive' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('delete error', { id, err })
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
