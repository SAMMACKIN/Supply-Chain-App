import { useState } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { formatDate } from '../../lib/utils'
import type { Quota } from '../../types/calloff'

interface QuotaSelectorProps {
  quotas?: Quota[]
  loading: boolean
  value: string
  onChange: (value: string) => void
  error?: string
}

export function QuotaSelector({ quotas, loading, value, onChange, error }: QuotaSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredQuotas = quotas?.filter(quota => 
    quota.metal_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quota.direction.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <Label htmlFor="quota-select">Select Quota *</Label>
      
      {loading ? (
        <div className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center text-sm text-gray-500">
          Loading quotas...
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="quota-select">
            <SelectValue placeholder="Choose a quota to call-off against" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                type="text"
                placeholder="Search by metal or direction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
            </div>
            {filteredQuotas?.map((quota) => (
              <SelectItem key={quota.quota_id} value={quota.quota_id}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">
                    {quota.metal_code} - {quota.direction}
                  </span>
                  <span className="text-sm text-gray-500 ml-4">
                    {quota.qty_t}t ({formatDate(quota.period_month)})
                  </span>
                </div>
              </SelectItem>
            ))}
            {filteredQuotas?.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No quotas found matching "{searchTerm}"
              </div>
            )}
          </SelectContent>
        </Select>
      )}
      
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  )
}