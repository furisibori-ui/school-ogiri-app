import { redirect } from 'next/navigation'

/**
 * トップページ: アーカイブ一覧へリダイレクト
 * API消費を避けるため、GPSでの学校生成フローは /create に分離
 */
export default function Home() {
  redirect('/archive')
}
