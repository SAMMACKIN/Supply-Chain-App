import { Truck, Search, Filter, Plus, MapPin } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function TransportOrders() {
  const transportOrders = [
    {
      id: 'TO-2025-0001',
      callOffId: 'CO-2025-0001',
      carrier: 'FastShip Logistics',
      pickupLocation: 'Warehouse A, Berlin',
      deliveryLocation: 'Acme Corp, Hamburg',
      scheduledDate: '2025-07-20',
      status: 'scheduled',
      trackingNumber: 'FS123456789'
    },
    {
      id: 'TO-2025-0002',
      callOffId: 'CO-2025-0002',
      carrier: 'Express Transport',
      pickupLocation: 'Warehouse B, Munich',
      deliveryLocation: 'TechCorp, Frankfurt',
      scheduledDate: '2025-07-15',
      status: 'in_transit',
      trackingNumber: 'ET987654321'
    },
    {
      id: 'TO-2025-0003',
      callOffId: 'CO-2025-0003',
      carrier: 'QuickMove GmbH',
      pickupLocation: 'Warehouse A, Berlin',
      deliveryLocation: 'Acme Corp, Hamburg',
      scheduledDate: '2025-07-08',
      status: 'delivered',
      trackingNumber: 'QM456789123'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transport Orders</h2>
          <p className="text-muted-foreground">
            Track and manage shipping and delivery operations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Transport
        </Button>
      </div>

      {/* Status overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-foreground">5</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold text-foreground">8</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-foreground">23</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delayed</p>
              <p className="text-2xl font-bold text-foreground">2</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <Truck className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transport orders..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Transport orders table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Call-Off
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Carrier
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Route
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Scheduled Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Tracking
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {transportOrders.map((order) => (
                <tr key={order.id} className="border-b border-border">
                  <td className="px-6 py-4 text-sm text-foreground font-medium">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {order.callOffId}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {order.carrier}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <div className="flex items-center text-xs">
                        <MapPin className="mr-1 h-3 w-3" />
                        {order.pickupLocation}
                      </div>
                      <div className="flex items-center text-xs">
                        <MapPin className="mr-1 h-3 w-3" />
                        {order.deliveryLocation}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {order.scheduledDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : order.status === 'in_transit'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                    {order.trackingNumber}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        Track
                      </Button>
                      <Button variant="outline" size="sm">
                        Details
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