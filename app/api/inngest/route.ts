import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { schoolGenerateFunction } from '@/lib/inngest/functions/school-generate'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [schoolGenerateFunction],
})
