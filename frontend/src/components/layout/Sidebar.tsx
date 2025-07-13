import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  FileText, 
  Truck, 
  Package, 
  Menu, 
  X,
  Home
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Quotas', href: '/quotas', icon: BarChart3 },
  { name: 'Call-Offs', href: '/call-offs', icon: FileText },
  { name: 'Transport Orders', href: '/transport', icon: Truck },
  { name: 'Inventory', href: '/inventory', icon: Package },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <span className="font-semibold text-foreground">Supply Chain</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-9 w-9"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-medium text-primary-foreground">
              {isCollapsed ? "U" : "US"}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">User</p>
              <p className="text-xs text-muted-foreground">Operations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}