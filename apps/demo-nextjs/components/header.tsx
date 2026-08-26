import Link from 'next/link'

const links = [
  { href: '/', label: 'Home' },
  { href: '/logger', label: 'Logger' },
]

export function Header() {
  return (
    <header className="border-b bg-background">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">
          Demo
        </Link>
        <ul className="flex items-center gap-4">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="text-sm">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
