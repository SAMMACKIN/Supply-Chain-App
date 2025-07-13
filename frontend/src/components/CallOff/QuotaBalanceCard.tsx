import { AlertTriangle } from 'lucide-react'
import type { QuotaBalance } from '../../types/calloff'

interface QuotaBalanceCardProps {
  balance: QuotaBalance
  requestedQty: number
}

export function QuotaBalanceCard({ balance, requestedQty }: QuotaBalanceCardProps) {
  const isExceeding = requestedQty > balance.remaining_qty_tonnes
  const utilizationAfter = ((balance.consumed_bundles + requestedQty) / balance.quota_qty_tonnes) * 100

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-3">Quota Information</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Total Quota:</span>
          <span className="font-medium ml-2">{balance.quota_qty_tonnes}t</span>
        </div>
        <div>
          <span className="text-gray-600">Consumed:</span>
          <span className="font-medium ml-2">{balance.consumed_bundles}t</span>
        </div>
        <div>
          <span className="text-gray-600">Available:</span>
          <span className={`font-medium ml-2 ${isExceeding ? 'text-red-600' : 'text-green-600'}`}>
            {balance.remaining_qty_tonnes}t
          </span>
        </div>
        <div>
          <span className="text-gray-600">Current Utilization:</span>
          <span className="font-medium ml-2">{balance.utilization_pct.toFixed(1)}%</span>
        </div>
      </div>

      {requestedQty > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">After this call-off:</span>
            <span className={`font-medium ${isExceeding ? 'text-red-600' : 'text-blue-600'}`}>
              {utilizationAfter.toFixed(1)}% utilization
            </span>
          </div>
          {balance.tolerance_pct > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Tolerance: ±{balance.tolerance_pct}% (max {(balance.quota_qty_tonnes * (1 + balance.tolerance_pct / 100)).toFixed(0)}t)
            </div>
          )}
        </div>
      )}

      {isExceeding && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Requested quantity exceeds available quota balance
        </div>
      )}
    </div>
  )
}