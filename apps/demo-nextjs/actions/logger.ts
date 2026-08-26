'use server'

import { emitLog } from '@/lib/utils'
import { FormValues } from '@/types'

export async function ServerLog(values: FormValues): Promise<void> {
  emitLog(values.transport, values.level, values.message, {
    from: 'server',
    context: values.context,
  })
}
