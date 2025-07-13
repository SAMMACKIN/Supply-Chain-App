import { FileText, Search, Filter, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function CallOffs() {
  const callOffs = [
    {
      id: 'CO-2025-0001',
      quotaId: 'QT-CU-2025-01',
      customer: 'Acme Corporation',
      part: 'Widget A',
      quantity: 100,
      deliveryDate: '2025-07-20',
      status: 'pending',
      createdAt: '2025-07-12'
    },
    {
      id: 'CO-2025-0002',
      quotaId: 'QT-CU-2025-02',
      customer: 'TechCorp Ltd',
      part: 'Component B',
      quantity: 50,
      deliveryDate: '2025-07-15',
      status: 'approved',
      createdAt: '2025-07-10'
    },
    {
      id: 'CO-2025-0003',
      quotaId: 'QT-CU-2025-01',
      customer: 'Acme Corporation',
      part: 'Widget A',
      quantity: 150,
      deliveryDate: '2025-07-25',
      status: 'shipped',
      createdAt: '2025-07-08'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Call-Offs</h2>
          <p className="text-muted-foreground">
            Manage call-off orders against customer quotas
          </p>
        </div>
        <Button asChild>
          <Link to="/call-offs/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Call-Off
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search call-offs..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Call-offs table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Call-Off ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Quota
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Part
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Quantity
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Delivery Date
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
              {callOffs.map((callOff) => (
                <tr key={callOff.id} className="border-b border-border">
                  <td className="px-6 py-4 text-sm text-foreground font-medium">
                    {callOff.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {callOff.quotaId}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {callOff.customer}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {callOff.part}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {callOff.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {callOff.deliveryDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      callOff.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : callOff.status === 'approved'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {callOff.status}
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