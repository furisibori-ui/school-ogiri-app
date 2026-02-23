import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { schoolGenerateFunction } from '@/lib/inngest/functions/school-generate'

// Step1(最大240s) + Step2(約36s) + Step3(最大24s) で 300s に収める。この export がないと Vercel デフォルトで FUNCTION_INVOCATION_TIMEOUT
export const maxDuration = 300

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [schoolGenerateFunction],
})
