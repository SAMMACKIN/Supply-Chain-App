import { BarChart3, Search, Filter, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function Quotas() {
  const quotas = [
    {
      id: 'QT-CU-2025-01',
      customer: 'Acme Corporation',
      part: 'Widget A',
      totalQuantity: 1000,
      consumedQuantity: 250,
      remainingQuantity: 750,
      validFrom: '2025-01-01',
      validTo: '2025-12-31',
      status: 'active'
    },
    {
      id: 'QT-CU-2025-02',
      customer: 'TechCorp Ltd',
      part: 'Component B',
      totalQuantity: 500,
      consumedQuantity: 450,
      remainingQuantity: 50,
      validFrom: '2025-01-15',
      validTo: '2025-06-30',
      status: 'active'
    },
    {
      id: 'QT-CU-2025-03',
      customer: 'Global Industries',
      part: 'Assembly C',
      totalQuantity: 2000,
      consumedQuantity: 2000,
      remainingQuantity: 0,
      validFrom: '2024-12-01',
      validTo: '2025-03-31',
      status: 'depleted'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quotas</h2>
          <p className="text-muted-foreground">
            Manage customer quotas and track consumption
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Quota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotas..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Quotas table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Quota ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Part
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Progress
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Valid Period
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {quotas.map((quota) => (
                <tr key={quota.id} className="border-b border-border">
                  <td className="px-6 py-4 text-sm text-foreground font-medium">
                    {quota.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {quota.customer}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {quota.part}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {quota.consumedQuantity}/{quota.totalQuantity}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round((quota.consumedQuantity / quota.totalQuantity) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            quota.remainingQuantity === 0
                              ? 'bg-red-500'
                              : quota.remainingQuantity < quota.totalQuantity * 0.2
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${(quota.consumedQuantity / quota.totalQuantity) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {quota.validFrom} - {quota.validTo}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      quota.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {quota.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}