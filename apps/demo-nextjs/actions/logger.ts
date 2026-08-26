'use server'

import { Log } from '@/lib/utils'
import { FormValues } from '@/types'

export async function DemoServerLog(values: FormValues): Promise<void> {
  const data = { from: 'server', context: values.context }

  Log[values.level](values.message, data)
}
