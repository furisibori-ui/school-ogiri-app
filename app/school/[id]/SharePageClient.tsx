'use client'

import { useRouter } from 'next/navigation'
import SchoolWebsite from '@/components/SchoolWebsite'
import type { SchoolData } from '@/types/school'

interface SharePageClientProps {
  data: SchoolData
}

export default function SharePageClient({ data }: SharePageClientProps) {
  const router = useRouter()
  const onReset = () => router.push('/archive')
  return <SchoolWebsite data={data} onReset={onReset} />
}
