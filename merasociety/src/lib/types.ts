// ============================================================
// MeraSociety — Type Definitions
// ============================================================

export type UserRole = 'admin' | 'resident' | 'guard'
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ListingCategory = 'buy_sell' | 'services' | 'food'
export type ListingStatus = 'active' | 'sold' | 'expired'
export type PassType = 'guest' | 'contractor' | 'delivery'
export type PassStatus = 'active' | 'used' | 'expired' | 'cancelled'
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed'
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent'
export type ChannelType = 'general' | 'topic' | 'listing'
export type FeedbackType = 'bug' | 'feature' | 'general' | 'complaint'
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Society {
  id: string
  name: string
  address: string | null
  invite_code: string
  settings: Record<string, unknown>
  created_at: string
}

export interface Member {
  id: string
  user_id: string
  society_id: string
  flat_number: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  status: MemberStatus
  is_verified: boolean
  created_at: string
}

export interface Announcement {
  id: string
  society_id: string
  author_id: string
  title: string
  content: string
  is_pinned: boolean
  priority: AnnouncementPriority
  created_at: string
  updated_at: string
  // Joined fields
  author?: Member
  comments_count?: number
  seen_count?: number
  is_seen?: boolean
}

export interface AnnouncementComment {
  id: string
  announcement_id: string
  author_id: string
  content: string
  created_at: string
  author?: Member
}

export interface Channel {
  id: string
  society_id: string
  name: string
  description: string | null
  type: ChannelType
  listing_id: string | null
  created_at: string
  // Computed
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  channel_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Member
}

export interface Listing {
  id: string
  society_id: string
  author_id: string
  title: string
  description: string | null
  category: ListingCategory
  price: number | null
  images: string[]
  tags: string[]
  status: ListingStatus
  ai_extracted: Record<string, unknown> | null
  contact_info: string | null
  created_at: string
  updated_at: string
  author?: Member
}

export interface VisitorPass {
  id: string
  society_id: string
  created_by: string
  visitor_name: string
  visitor_phone: string | null
  pass_type: PassType
  pass_code: string
  purpose: string | null
  expected_date: string
  expected_time_start: string | null
  expected_time_end: string | null
  status: PassStatus
  verified_by: string | null
  verified_at: string | null
  is_one_time: boolean
  created_at: string
  expires_at: string | null
  creator?: Member
}

export interface Court {
  id: string
  society_id: string
  name: string
  sport: string
  description: string | null
  slot_duration_minutes: number
  max_daily_hours_per_flat: number
  open_time: string
  close_time: string
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  court_id: string
  member_id: string
  society_id: string
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
  created_at: string
  court?: Court
  member?: Member
}

export interface Notification {
  id: string
  member_id: string
  society_id: string
  title: string
  body: string | null
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}

export interface Feedback {
  id: string
  society_id: string
  member_id: string
  type: FeedbackType
  title: string
  description: string | null
  status: FeedbackStatus
  created_at: string
  member?: Member
}

export interface AuditLogEntry {
  id: string
  society_id: string
  member_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// AI extraction types
export interface AIExtractedListing {
  title: string
  description: string
  category: ListingCategory
  price: number | null
  tags: string[]
  condition?: string
  urgency?: string
}

export interface AIMatchResult {
  listing_id: string
  score: number
  reason: string
}

// Demo data types
export interface DemoMember extends Member {
  email: string
}

// App state
export interface AppState {
  currentMember: Member | null
  currentSociety: Society | null
  isLoading: boolean
  isDemoMode: boolean
}
