import { create } from 'zustand'
import type { Member, Society } from './types'

interface AppStore {
  // Auth state
  currentMember: Member | null
  currentSociety: Society | null
  isLoading: boolean
  isDemoMode: boolean

  // Actions
  setCurrentMember: (member: Member | null) => void
  setCurrentSociety: (society: Society | null) => void
  setLoading: (loading: boolean) => void
  setDemoMode: (demo: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentMember: null,
  currentSociety: null,
  isLoading: true,
  isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',

  setCurrentMember: (member) => set({ currentMember: member }),
  setCurrentSociety: (society) => set({ currentSociety: society }),
  setLoading: (loading) => set({ isLoading: loading }),
  setDemoMode: (demo) => set({ isDemoMode: demo }),
  reset: () => set({
    currentMember: null,
    currentSociety: null,
    isLoading: false,
  }),
}))

// Demo data store for when Supabase is not configured
interface DemoStore {
  initialized: boolean
  announcements: Array<Record<string, unknown>>
  messages: Array<Record<string, unknown>>
  listings: Array<Record<string, unknown>>
  passes: Array<Record<string, unknown>>
  bookings: Array<Record<string, unknown>>
  notifications: Array<Record<string, unknown>>
  
  initialize: () => void
  addItem: (collection: string, item: Record<string, unknown>) => void
}

export const useDemoStore = create<DemoStore>((set, get) => ({
  initialized: false,
  announcements: [],
  messages: [],
  listings: [],
  passes: [],
  bookings: [],
  notifications: [],

  initialize: () => {
    if (get().initialized) return
    set({
      initialized: true,
      announcements: getDemoAnnouncements(),
      listings: getDemoListings(),
      passes: getDemoPasses(),
      messages: getDemoMessages(),
      bookings: [],
      notifications: getDemoNotifications(),
    })
  },

  addItem: (collection, item) => {
    set((state) => ({
      ...state,
      [collection]: [...(state[collection as keyof typeof state] as Array<Record<string, unknown>> || []), item],
    }))
  },
}))

// Demo data generators
function getDemoAnnouncements() {
  return [
    {
      id: 'demo-ann-1',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-1',
      title: '🚰 Water Supply Disruption - Feb 28',
      content: 'Dear residents, the municipal corporation has informed us of a scheduled water supply disruption on February 28th from 10 AM to 4 PM. Please store adequate water. Tanker backup has been arranged for emergency use. Contact the office for any concerns.',
      is_pinned: true,
      priority: 'urgent',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      author: { full_name: 'Rajesh Kumar (Admin)', flat_number: 'A-101', role: 'admin' },
      comments_count: 5,
      seen_count: 42,
    },
    {
      id: 'demo-ann-2',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-1',
      title: '🎉 Annual Society Day Celebration',
      content: 'We are excited to announce the Annual Sunrise Heights Society Day on March 15th! Events include fun games for kids, cultural programs, food stalls, and a DJ night. Flat contributions: ₹500 per flat. Register your performances at the society office by March 5th.',
      is_pinned: false,
      priority: 'normal',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      author: { full_name: 'Rajesh Kumar (Admin)', flat_number: 'A-101', role: 'admin' },
      comments_count: 12,
      seen_count: 38,
    },
    {
      id: 'demo-ann-3',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-1',
      title: '🏗️ Lift Maintenance Schedule',
      content: 'Lift B will undergo routine maintenance on March 1st between 9 AM and 1 PM. Please use Lift A or the staircase during this period. We apologize for the inconvenience.',
      is_pinned: false,
      priority: 'high',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 172800000).toISOString(),
      author: { full_name: 'Rajesh Kumar (Admin)', flat_number: 'A-101', role: 'admin' },
      comments_count: 3,
      seen_count: 55,
    },
    {
      id: 'demo-ann-4',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-1',
      title: '🔒 New Security Protocol',
      content: 'Starting March 1st, all visitors must have a pre-approved digital pass via MeraSociety app. Guards will verify the pass code at the gate. Please pre-register your guests and contractors using the Security section. This helps us maintain a safer environment for everyone.',
      is_pinned: true,
      priority: 'high',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      updated_at: new Date(Date.now() - 259200000).toISOString(),
      author: { full_name: 'Rajesh Kumar (Admin)', flat_number: 'A-101', role: 'admin' },
      comments_count: 8,
      seen_count: 61,
    },
  ]
}

function getDemoListings() {
  return [
    {
      id: 'demo-listing-1',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-2',
      title: 'Samsung 7kg Washing Machine',
      description: '2 year old Samsung front-load washing machine. Works perfectly, selling because upgrading. Self-pickup from B-302.',
      category: 'buy_sell',
      price: 8000,
      images: [],
      tags: ['electronics', 'washing-machine', 'samsung'],
      status: 'active',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      author: { full_name: 'Priya Sharma', flat_number: 'B-302', role: 'resident' },
    },
    {
      id: 'demo-listing-2',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-3',
      title: 'Experienced Cook Available',
      description: 'Our cook Lakshmi is available for 2 more households. She cooks excellent South Indian and North Indian food. Available for lunch and dinner. Very hygienic and punctual.',
      category: 'services',
      price: 4000,
      images: [],
      tags: ['cook', 'south-indian', 'north-indian', 'daily'],
      status: 'active',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 14400000).toISOString(),
      author: { full_name: 'Anita Desai', flat_number: 'C-501', role: 'resident' },
    },
    {
      id: 'demo-listing-3',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-4',
      title: 'Homemade Rajasthani Thali - Weekend Special',
      description: 'This weekend: Dal Baati Churma, Gatte ki Sabzi, Ker Sangri, Mirchi Vada, and Ghevar! Order by Friday evening. ₹200 per thali. Min order 2 thalis.',
      category: 'food',
      price: 200,
      images: [],
      tags: ['homemade', 'rajasthani', 'weekend', 'thali'],
      status: 'active',
      created_at: new Date(Date.now() - 28800000).toISOString(),
      updated_at: new Date(Date.now() - 28800000).toISOString(),
      author: { full_name: 'Meena Rathore', flat_number: 'A-204', role: 'resident' },
    },
    {
      id: 'demo-listing-4',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-5',
      title: 'IKEA Study Table + Chair',
      description: 'IKEA BEKANT desk (120x80cm) with MARKUS office chair. Both in excellent condition, 1 year old. Selling as we\'re relocating.',
      category: 'buy_sell',
      price: 12000,
      images: [],
      tags: ['furniture', 'ikea', 'desk', 'chair', 'office'],
      status: 'active',
      created_at: new Date(Date.now() - 43200000).toISOString(),
      updated_at: new Date(Date.now() - 43200000).toISOString(),
      author: { full_name: 'Vikram Singh', flat_number: 'D-103', role: 'resident' },
    },
    {
      id: 'demo-listing-5',
      society_id: '00000000-0000-0000-0000-000000000001',
      author_id: 'demo-member-6',
      title: 'Reliable Plumber Recommendation',
      description: 'Recommending Raju Plumber - very skilled, reasonable rates, comes on time. Has been working in our society for 5 years. Handles everything from leaks to full bathroom renovation.',
      category: 'services',
      price: null,
      images: [],
      tags: ['plumber', 'recommendation', 'maintenance', 'home'],
      status: 'active',
      created_at: new Date(Date.now() - 57600000).toISOString(),
      updated_at: new Date(Date.now() - 57600000).toISOString(),
      author: { full_name: 'Deepak Nair', flat_number: 'B-105', role: 'resident' },
    },
  ]
}

function getDemoPasses() {
  return [
    {
      id: 'demo-pass-1',
      society_id: '00000000-0000-0000-0000-000000000001',
      created_by: 'demo-member-2',
      visitor_name: 'Amit Patel',
      visitor_phone: '9876543210',
      pass_type: 'guest',
      pass_code: 'XK7M2N',
      purpose: 'Family dinner visit',
      expected_date: new Date().toISOString().split('T')[0],
      expected_time_start: '18:00',
      expected_time_end: '22:00',
      status: 'active',
      is_one_time: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      creator: { full_name: 'Priya Sharma', flat_number: 'B-302' },
    },
    {
      id: 'demo-pass-2',
      society_id: '00000000-0000-0000-0000-000000000001',
      created_by: 'demo-member-3',
      visitor_name: 'Reliable Plumbers',
      visitor_phone: '9988776655',
      pass_type: 'contractor',
      pass_code: 'PL4B8R',
      purpose: 'Bathroom pipe repair',
      expected_date: new Date().toISOString().split('T')[0],
      expected_time_start: '10:00',
      expected_time_end: '14:00',
      status: 'active',
      is_one_time: true,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      creator: { full_name: 'Anita Desai', flat_number: 'C-501' },
    },
  ]
}

function getDemoMessages() {
  return [
    {
      id: 'demo-msg-1',
      channel_id: '00000000-0000-0000-0000-000000000201',
      sender_id: 'demo-member-1',
      content: 'Good morning everyone! Please remember to park only in your designated spots.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      sender: { full_name: 'Rajesh Kumar', flat_number: 'A-101' },
    },
    {
      id: 'demo-msg-2',
      channel_id: '00000000-0000-0000-0000-000000000201',
      sender_id: 'demo-member-2',
      content: 'Has anyone seen a grey tabby cat? She wandered out from B-302 this morning 😅',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      sender: { full_name: 'Priya Sharma', flat_number: 'B-302' },
    },
    {
      id: 'demo-msg-3',
      channel_id: '00000000-0000-0000-0000-000000000201',
      sender_id: 'demo-member-4',
      content: 'Weekend Rajasthani thali orders open! Check the Bazaar for details 🍛',
      created_at: new Date(Date.now() - 900000).toISOString(),
      sender: { full_name: 'Meena Rathore', flat_number: 'A-204' },
    },
    {
      id: 'demo-msg-4',
      channel_id: '00000000-0000-0000-0000-000000000202',
      sender_id: 'demo-member-5',
      content: 'Selling an IKEA desk and chair set. Almost new. Check bazaar listing!',
      created_at: new Date(Date.now() - 600000).toISOString(),
      sender: { full_name: 'Vikram Singh', flat_number: 'D-103' },
    },
  ]
}

function getDemoNotifications() {
  return [
    {
      id: 'demo-notif-1',
      member_id: 'demo-member-2',
      title: 'New announcement: Water Supply Disruption',
      body: 'Admin posted an urgent announcement about water supply.',
      type: 'announcement',
      is_read: false,
      link: '/dashboard/announcements',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'demo-notif-2',
      member_id: 'demo-member-2',
      title: 'Your visitor pass is ready',
      body: 'Pass code XK7M2N generated for Amit Patel.',
      type: 'security',
      is_read: true,
      link: '/dashboard/security',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ]
}
