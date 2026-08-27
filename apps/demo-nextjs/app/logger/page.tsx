'use client'

import { useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { ServerLog } from '@/actions/logger'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { emitLog } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormValues, Levels, Transports } from '@/types'

export default function LoggerPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const { register, getValues, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      message: 'Test message',
      level: 'info',
      context: '',
      transport: 'console',
    },
  })

  const handleClientLog = () => {
    const { message, level, context, transport } = getValues()
    emitLog(transport, level, message, {
      from: 'client',
      context: context || undefined,
    })
  }

  const handleMiddlewareLog = () => {
    const { message, level, context, transport } = getValues()
    void fetch('/logger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transport,
        level,
        message,
        ...(context ? { context } : {}),
      }),
    }).catch(() => {})
  }

  const onServerSubmit = handleSubmit(async (data) => {
    await ServerLog(data)
  })

  return (
    <div className="w-100 rounded-2xl border p-4">
      <form ref={formRef} onSubmit={onServerSubmit}>
        <FieldSet>
          <FieldLegend>Logger demo</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="message">Message</FieldLabel>
              <FieldContent>
                <Input
                  id="message"
                  type="text"
                  placeholder="e.g. Button clicked"
                  {...register('message')}
                />
                <FieldDescription>The text that will be written to the log.</FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="level">Level</FieldLabel>
              <FieldContent>
                <Controller
                  name="level"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a level" />
                      </SelectTrigger>
                      <SelectContent>
                        {Levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>Log level to use.</FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="context">Context</FieldLabel>
              <FieldContent>
                <Input
                  id="context"
                  type="text"
                  placeholder="e.g. users:1"
                  {...register('context')}
                />
                <FieldDescription>
                  Optional structured data attached to the log record.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="transport">Transport</FieldLabel>
              <FieldContent>
                <Controller
                  name="transport"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a transport" />
                      </SelectTrigger>
                      <SelectContent>
                        {Transports.map((transport) => (
                          <SelectItem key={transport} value={transport}>
                            {transport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>
                  Send the log via <code>console.log</code> or via the LogTape logger directly.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </FieldSet>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="submit">Server</Button>
          <Button type="button" variant="outline" onClick={handleClientLog}>
            Client
          </Button>
          <Button type="button" variant="outline" onClick={handleMiddlewareLog}>
            Middleware
          </Button>
        </div>
      </form>
    </div>
  )
}
