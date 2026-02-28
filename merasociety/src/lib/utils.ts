import { clsx, type ClassValue } from 'clsx'

// Lightweight clsx implementation (no external dep needed)
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export function generatePassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function generateTimeSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  
  let currentMinutes = openH * 60 + openM
  const endMinutes = closeH * 60 + closeM

  while (currentMinutes + durationMinutes <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60)
    const startM = currentMinutes % 60
    const endSlotMinutes = currentMinutes + durationMinutes
    const endH = Math.floor(endSlotMinutes / 60)
    const endM = endSlotMinutes % 60

    slots.push({
      start: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
      end: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
    })

    currentMinutes += durationMinutes
  }

  return slots
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': case 'confirmed': case 'approved': case 'open':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'pending': case 'in_progress':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'used': case 'completed': case 'sold': case 'resolved':
      return 'text-blue-700 bg-blue-50 border-blue-200'
    case 'expired': case 'cancelled': case 'rejected': case 'closed': case 'suspended':
      return 'text-red-700 bg-red-50 border-red-200'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'buy_sell': return 'Buy & Sell'
    case 'services': return 'Services'
    case 'food': return 'Food'
    default: return category
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'buy_sell': return '🛒'
    case 'services': return '🔧'
    case 'food': return '🍽️'
    default: return '📦'
  }
}

export function getPassTypeLabel(type: string): string {
  switch (type) {
    case 'guest': return 'Guest'
    case 'contractor': return 'Contractor'
    case 'delivery': return 'Delivery'
    default: return type
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
