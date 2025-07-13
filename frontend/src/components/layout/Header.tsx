import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ThemeToggle } from '../ui/theme-toggle'

interface HeaderProps {
  title?: string
}

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case '/':
      return 'Dashboard'
    case '/quotas':
      return 'Quotas'
    case '/call-offs':
      return 'Call-Offs'
    case '/call-offs/create':
      return 'Create Call-Off'
    case '/transport':
      return 'Transport Orders'
    case '/inventory':
      return 'Inventory'
    default:
      return 'Dashboard'
  }
}

export function Header({ title }: HeaderProps) {
  const location = useLocation()
  const pageTitle = title || getPageTitle(location.pathname)
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search quotas, call-offs, orders..."
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}