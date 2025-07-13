import { BarChart3, FileText, Truck, Package, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export function Dashboard() {
  const stats = [
    {
      name: 'Active Quotas',
      value: '20',
      change: '+2 from last month',
      changeType: 'positive' as const,
      icon: BarChart3,
    },
    {
      name: 'Call-Offs Created',
      value: '8',
      change: '+3 this week',
      changeType: 'positive' as const,
      icon: FileText,
    },
    {
      name: 'Transport Orders',
      value: '12',
      change: '5 in progress',
      changeType: 'neutral' as const,
      icon: Truck,
    },
    {
      name: 'Inventory Items',
      value: '1,247',
      change: '98% capacity',
      changeType: 'neutral' as const,
      icon: Package,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground">
          Here's what's happening with your supply chain operations today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className={`mr-1 h-4 w-4 ${
                  stat.changeType === 'positive' 
                    ? 'text-green-500' 
                    : 'text-muted-foreground'
                }`} />
                <span className={
                  stat.changeType === 'positive' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-muted-foreground'
                }>
                  {stat.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/call-offs/create">Create Call-Off</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/quotas">View Quotas</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inventory">Check Inventory</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/transport">Schedule Transport</Link>
          </Button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'Call-off CO-2025-0001 created', time: '2 hours ago', type: 'call-off' },
              { action: 'Quota QT-CU-2025-07 updated', time: '4 hours ago', type: 'quota' },
              { action: 'Transport order TO-2025-0015 completed', time: '1 day ago', type: 'transport' },
              { action: 'Inventory lot IL-2025-0032 received', time: '2 days ago', type: 'inventory' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.type === 'call-off' ? 'bg-blue-500' :
                    activity.type === 'quota' ? 'bg-green-500' :
                    activity.type === 'transport' ? 'bg-yellow-500' :
                    'bg-purple-500'
                  }`} />
                  <span className="text-sm text-foreground">{activity.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}