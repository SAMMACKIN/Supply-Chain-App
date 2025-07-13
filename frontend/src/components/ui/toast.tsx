import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from './button'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

export function Toast({ toast, onRemove }: ToastProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={`fixed top-4 right-4 max-w-md w-full ${getBgColor()} border rounded-lg shadow-lg p-4 z-50`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm text-gray-900">{toast.message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(toast.id)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(${index * 60}px)` }}
          className="transition-transform duration-300"
        >
          <Toast toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}