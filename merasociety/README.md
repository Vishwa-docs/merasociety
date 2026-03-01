# MeraSociety — Your Society, Connected

> A verified, private mini-social network for apartment societies — replacing chaotic WhatsApp groups with structured, searchable workflows.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase)
![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-GPT--4o-0078d4?logo=microsoftazure)

## The Problem

Every apartment society in India runs on WhatsApp. The result?
- **Lost announcements** buried under 200 "👍" replies
- **Chaotic buy/sell** — "Anyone selling a washing machine?" scrolls away in minutes
- **Security headaches** — guards calling residents, "Sir, koi Amit Patel aaya hai..."
- **Court booking fights** — "I was first!" / "No, I booked it!" with no proof
- **No structure** — conversations about plumber recommendations mixed with Diwali party plans

## The Solution

**MeraSociety** gives your society a private, verified platform with structured workflows:

### Core Modules

| Module | What it does |
|--------|-------------|
| **Announcements** | Admin posts with priority levels, comments, seen tracking |
| **Chat** | Topic-based channels (General, Buy/Sell, Food, Sports) with real-time messaging |
| **Bazaar** | Structured marketplace with AI-powered "WhatsApp text → structured listing" extraction |
| **Security** | Pre-register visitors, generate QR/pass codes, guard verification dashboard |
| **Sports** | Court booking with fairness rules (max 2 hrs/day per flat enforced server-side) |
| **AI Features** | Smart listing extraction from informal text + intelligent matching |

## Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Azure OpenAI API key (optional, for AI features)

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/merasociety.git
cd merasociety

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Azure OpenAI credentials

# Set up database
# Copy contents of supabase/schema.sql into your Supabase SQL Editor and run

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 + React 19 | App Router, Server Components, API Routes |
| Styling | Tailwind CSS v4 | Utility-first, fast to iterate |
| Backend | Supabase | Postgres + Auth + Row Level Security + Realtime |
| AI | Azure OpenAI (GPT-4o) | Smart data extraction & matching |
| QR Codes | qrcode.js | Visitor pass verification |
| State | Zustand | Lightweight client state management |
| Icons | Lucide React | Beautiful, consistent iconography |
| Deployment | Vercel | Zero-config Next.js deployment |

## Project Structure

```
merasociety/
├── src/
│   ├── app/
│   │   ├── auth/            # Login, signup, OAuth callback
│   │   ├── dashboard/       # Protected dashboard routes
│   │   │   ├── admin/       # Admin dashboard
│   │   │   ├── announcements/  # Announcements CRUD
│   │   │   ├── bazaar/      # Marketplace listings
│   │   │   ├── chat/        # Real-time chat
│   │   │   ├── feedback/    # User feedback
│   │   │   ├── notifications/ # Notification center
│   │   │   ├── security/    # Visitor passes & verification
│   │   │   ├── settings/    # User settings
│   │   │   └── sports/      # Court booking
│   │   ├── api/             # API routes (AI, seed)
│   │   └── join/            # Society join flow
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── layout/          # Sidebar, Header, MobileNav
│   └── lib/
│       ├── supabase/        # Supabase client setup
│       ├── ai.ts            # Azure OpenAI integration
│       ├── store.ts         # Zustand store (auth state)
│       ├── types.ts         # TypeScript type definitions
│       └── utils.ts         # Utility functions
└── supabase/
    └── schema.sql           # Complete database schema + RLS + seed
```

## Security

- **Row Level Security (RLS)** on all tables — members can only access their society's data
- **Invite-code gated** — can't join without a valid society code
- **Admin approval** — new members need admin approval before accessing features
- **Role-based access** — admin, resident, and guard roles with different permissions
- **Visitor verification** — unique pass codes + QR codes with expiration

## Court Booking Fairness

The sports booking system enforces fairness rules server-side:
- **Max daily hours per flat**: Each flat can book at most 2 hours per day per court
- **Conflict prevention**: Unique constraints prevent double-booking
- **Transparent usage**: Members can see their remaining quota
- **Enforced by database function**: `check_booking_fairness()` runs on every booking

## AI Features

### Smart Listing Extraction
Paste a WhatsApp-style message like:
> "Selling my 2 year old Samsung washing machine, 7kg, works perfectly. 8000 rs. DM me flat B-302"

AI extracts:
```json
{
  "title": "Samsung 7kg Washing Machine",
  "category": "buy_sell",
  "price": 8000,
  "tags": ["electronics", "washing-machine", "samsung"],
  "condition": "good"
}
```

### Intelligent Matching
Describe what you're looking for, and AI matches you with relevant listings based on semantic understanding.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set root directory to `merasociety`
4. Add environment variables
5. Deploy!

### Environment Variables for Production

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_API_KEY=your_api_key
```

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with care for Indian apartment communities.
