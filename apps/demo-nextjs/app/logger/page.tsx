export default function Home() {
  console.log('Plain message')
  console.log('User logged in', { userId: 42, role: 'admin' })
  console.log('Order', { id: 'ord-1', total: 12.5 }, { items: 3 })
  console.info('Server ready', { port: 3000 })
  console.debug('Debug message', { flag: true })
  console.warn('Cache miss', { key: 'users:1' })
  console.error('Failed request', { status: 500, path: '/api' })
  console.trace('Trace message')

  const nextLog = require('next/dist/build/output/log')
  nextLog.ready('Server started')
  nextLog.warn('Deprecated route', { route: '/old' })
  nextLog.error('Build failed', { error: 'ENOENT' })

  return (
    <main>
      <h1>Test Next.js Logger</h1>
      <p>Check terminal for JSON logs.</p>
      <a href="/">Home page</a>
    </main>
  )
}
