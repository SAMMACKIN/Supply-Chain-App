import { Package, Search, Filter, Plus, AlertTriangle, TrendingDown } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function Inventory() {
  const inventoryItems = [
    {
      id: 'IL-2025-0001',
      partNumber: 'WGT-A-001',
      description: 'Widget A - Blue Variant',
      location: 'Warehouse A - A1-B2',
      currentStock: 750,
      minimumStock: 100,
      maximumStock: 1000,
      unit: 'pcs',
      lastUpdated: '2025-07-12',
      status: 'normal'
    },
    {
      id: 'IL-2025-0002',
      partNumber: 'CMP-B-002',
      description: 'Component B - Standard',
      location: 'Warehouse B - C3-D4',
      currentStock: 25,
      minimumStock: 50,
      maximumStock: 500,
      unit: 'pcs',
      lastUpdated: '2025-07-11',
      status: 'low'
    },
    {
      id: 'IL-2025-0003',
      partNumber: 'ASM-C-003',
      description: 'Assembly C - Premium',
      location: 'Warehouse A - E5-F6',
      currentStock: 0,
      minimumStock: 20,
      maximumStock: 200,
      unit: 'sets',
      lastUpdated: '2025-07-10',
      status: 'out_of_stock'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground">
            Monitor stock levels and manage warehouse inventory
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Inventory overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-foreground">1,247</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-foreground">8</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold text-foreground">3</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Warehouse Utilization</p>
              <p className="text-2xl font-bold text-foreground">78%</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Inventory table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Part Number
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Current Stock
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Stock Level
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Last Updated
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="px-6 py-4 text-sm text-foreground font-medium">
                    {item.partNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Min: {item.minimumStock}
                        </span>
                        <span className="text-muted-foreground">
                          Max: {item.maximumStock}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.currentStock === 0
                              ? 'bg-red-500'
                              : item.currentStock <= item.minimumStock
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((item.currentStock / item.maximumStock) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'normal'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : item.status === 'low'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {item.status === 'out_of_stock' ? 'out of stock' : item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.lastUpdated}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        Adjust
                      </Button>
                      <Button variant="outline" size="sm">
                        History
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