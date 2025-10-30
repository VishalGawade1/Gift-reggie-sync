# Gift Reggie Wishlist Sync

A full-stack application that synchronizes wishlist data from Gift Reggie's API into your own database, providing a dashboard to view and manage synced wishlists.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Backend Functions](#backend-functions)
- [Development](#development)
- [Deployment](#deployment)

## Overview

This application acts as a middleware between Gift Reggie's API and your own database. It:

1. **Securely stores** your Gift Reggie API credentials (Store ID and Access Token)
2. **Syncs wishlist data** from Gift Reggie to your database
3. **Displays wishlists** in an easy-to-use dashboard
4. **Tracks sync status** with checkpoints and timestamps

## Features

### Frontend
- **Home Page** - Landing page with navigation
- **Settings Page** - Secure credential management with form validation
- **Dashboard** - View all synced wishlists with real-time status
- **Manual Sync** - Trigger synchronization on demand
- **Responsive Design** - Works on desktop and mobile

### Backend
- **Encrypted Secret Storage** - Credentials stored securely in the database
- **Automatic Pagination** - Handles large wishlist datasets
- **Retry Logic** - Resilient API calls with exponential backoff
- **Rate Limiting** - Prevents API throttling (500ms between requests)
- **Checkpoint System** - Resume syncs from where they left off
- **API Auto-Detection** - Automatically detects Gift Reggie API endpoint style

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (built on Radix UI)
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Router v6** - Client-side routing
- **Sonner** - Toast notifications

### Backend
- **PostgreSQL Database** - Relational database with JSONB support
- **Edge Functions** - Serverless backend functions (Deno runtime)
- **Row-Level Security (RLS)** - Database-level access control
- **Secrets Management** - Encrypted environment variables
- **Real-time Subscriptions** - Live data updates (available for future use)

## Architecture

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌────────────────────┐              ┌────────────────────┐
│  update-credentials│              │  sync-gift-reggie  │
│   Edge Function    │              │   Edge Function    │
└────────┬───────────┘              └────────┬───────────┘
         │                                   │
         ├───────────────────────────────────┤
         │                                   │
         ▼                                   ▼
┌─────────────────────────────────────────────────────┐
│               Cloud Database                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────┐│
│  │  wishlists   │  │ wishlist_items│  │sync_state││
│  └──────────────┘  └───────────────┘  └──────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │         Encrypted Secrets Storage           │  │
│  │  • GIFT_REGGIE_STORE_ID                     │  │
│  │  • GIFT_REGGIE_TOKEN                        │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │
         │ (Edge Function makes API calls)
         ▼
┌─────────────────────┐
│  Gift Reggie API    │
│ (External Service)  │
└─────────────────────┘
```

## Database Schema

### `wishlists` Table
Stores the main wishlist information.

| Column              | Type                     | Description                           |
|---------------------|--------------------------|---------------------------------------|
| `id`                | `text` (PK)              | Unique wishlist ID from Gift Reggie   |
| `owner_customer_id` | `text`                   | Customer ID of wishlist owner         |
| `owner_email`       | `text`                   | Email of wishlist owner               |
| `public_url`        | `text`                   | Public URL to view the wishlist       |
| `raw`               | `jsonb`                  | Full JSON response from Gift Reggie   |
| `last_synced_at`    | `timestamp with time zone` | When this wishlist was last synced  |
| `first_seen_at`     | `timestamp with time zone` | When first discovered (auto-set)    |

**RLS Policy**: Anyone can view wishlists (SELECT)

### `wishlist_items` Table
Stores individual items within each wishlist.

| Column        | Type      | Description                              |
|---------------|-----------|------------------------------------------|
| `wishlist_id` | `text`    | Foreign key to `wishlists.id`            |
| `product_id`  | `text`    | Product ID from Gift Reggie              |
| `variant_id`  | `text` (PK) | Unique variant ID                       |
| `quantity`    | `integer` | Quantity requested                       |
| `raw`         | `jsonb`   | Full JSON of the item                    |

**Composite Primary Key**: (`wishlist_id`, `variant_id`, `product_id`)  
**RLS Policy**: Anyone can view items (SELECT)

### `sync_state` Table
Tracks synchronization progress.

| Column       | Type                       | Description                     |
|--------------|----------------------------|---------------------------------|
| `key`        | `text` (PK)                | State key (e.g., 'cursor')      |
| `value`      | `text`                     | State value (e.g., page token)  |
| `updated_at` | `timestamp with time zone` | Last update time                |

**RLS Policy**: Anyone can view sync state (SELECT)

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **bun** (comes with Node.js)
- **Gift Reggie Account** with API access

### Installation

1. **Clone the repository**

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**

```sh
npm install
```

3. **Start the development server**

```sh
npm run dev
```

The app will be available at `http://localhost:8080`

## Configuration

### Step 1: Get Your Gift Reggie API Credentials

1. Log in to your Gift Reggie account
2. Navigate to **Settings → API** or **Developer Settings**
3. Copy your:
   - **Store ID** (sometimes called Shop ID)
   - **Access Token** (or API Key)

**Security Note**: These credentials are stored encrypted in the database and are never exposed in your frontend code.

### Step 2: Configure the Application

1. Navigate to the **Settings** page in the app (`/settings`)
2. Enter your **Store ID**
3. Enter your **Access Token**
4. Click **Save Credentials**

The credentials are securely stored via the `update-credentials` Edge Function and encrypted in the database.

## Usage Guide

### Initial Sync

1. Go to the **Dashboard** page (`/dashboard`)
2. Click the **Sync Now** button
3. Wait for the sync to complete (progress updates automatically)
4. View your synced wishlists in the table

### Understanding the Dashboard

**Summary Cards**:
- **Total Wishlists** - Number of unique wishlists synced
- **Last Sync** - Timestamp of the most recent sync
- **Status** - Current sync cursor/checkpoint

**Wishlists Table**:
- **Wishlist ID** - Unique identifier
- **Owner Email** - Email of the wishlist creator
- **Last Synced** - When this specific wishlist was updated
- **Actions** - Link to view the wishlist on Gift Reggie

### Re-syncing

You can trigger manual syncs at any time:
- Click **Sync Now** on the dashboard
- The system will resume from the last checkpoint
- New wishlists will be added, existing ones updated

## Backend Functions

### `update-credentials`

**Purpose**: Securely update Gift Reggie API credentials  
**Location**: `supabase/functions/update-credentials/index.ts`  
**Trigger**: Called from Settings page when user saves credentials

**How it works**:
1. Receives `storeId` and `token` from the frontend
2. Validates the inputs
3. Uses the database `set_secret` RPC to encrypt and store:
   - `GIFT_REGGIE_STORE_ID`
   - `GIFT_REGGIE_TOKEN`
4. Returns success/error response

**Security**:
- CORS enabled for browser requests
- Input validation
- Secrets encrypted at rest
- Service role key used for privileged operations

### `sync-gift-reggie`

**Purpose**: Fetch wishlist data from Gift Reggie API and sync to database  
**Location**: `supabase/functions/sync-gift-reggie/index.ts`  
**Trigger**: Called from Dashboard when user clicks "Sync Now"

**How it works**:

1. **Load Credentials** - Retrieves encrypted secrets from the database
2. **API Detection** - Auto-detects Gift Reggie API endpoint and pagination style
3. **Load Checkpoint** - Reads the last sync cursor from `sync_state` table
4. **Sync Loop**:
   - Build request URL with cursor/page parameter
   - Make API request with retry logic (up to 3 attempts)
   - Parse response (handles both paginated and non-paginated formats)
   - **Upsert Wishlists** - Insert new or update existing wishlists
   - **Upsert Items** - Insert new or update existing wishlist items
   - Update checkpoint in `sync_state` table
   - Throttle (500ms delay between requests)
   - Continue until no more pages
5. **Return Results** - Summary of synced data

**Features**:
- **Idempotent** - Can be run multiple times safely (upsert operations)
- **Resumable** - Uses checkpoints to continue from interruptions
- **Rate-Limited** - 500ms between requests to respect API limits
- **Resilient** - Exponential backoff retry on failures
- **Adaptive** - Handles different API response formats

**API Detection Logic**:

The function automatically detects:
- **Endpoint Style**: `wishlists` vs `shop/{store_id}/wishlists`
- **Pagination Style**: 
  - Cursor-based: `?cursor=xyz`
  - Page-based: `?page=2`

**Error Handling**:
- Network failures → Retry up to 3 times with exponential backoff
- API errors → Logged and returned to frontend
- Invalid credentials → Clear error message
- Database errors → Logged and returned

## Development

### Project Structure

```
├── src/
│   ├── components/ui/          # shadcn/ui components
│   ├── integrations/supabase/  # Auto-generated Supabase types & client
│   ├── pages/
│   │   ├── Index.tsx           # Home page
│   │   ├── Settings.tsx        # Credentials management
│   │   └── WishlistDashboard.tsx # Main dashboard
│   ├── App.tsx                 # Main app component
│   └── main.tsx                # Entry point
├── supabase/
│   ├── functions/
│   │   ├── sync-gift-reggie/
│   │   │   └── index.ts        # Sync Edge Function
│   │   └── update-credentials/
│   │       └── index.ts        # Credentials Edge Function
│   ├── migrations/             # Database migrations (auto-generated)
│   └── config.toml             # Supabase config
└── README.md                   # This file
```

### Environment Variables

These are automatically managed and configured:

```env
VITE_SUPABASE_URL=https://qvzvulblxbrkczdrbjhr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=qvzvulblxbrkczdrbjhr
```

**DO NOT** edit `.env` manually - it's auto-generated.

### Making Changes

**Frontend Changes**:
1. Edit files in `src/`
2. Hot reload will update the preview automatically
3. Use TypeScript for type safety

**Backend Changes**:
1. Edit Edge Function files in `supabase/functions/*/index.ts`
2. Deploy automatically on save
3. Test using the dashboard

**Database Changes**:
- Use migration tools (never edit migrations directly)
- All changes are tracked in `supabase/migrations/`

### Debugging

**Frontend**:
- Open browser DevTools (F12)
- Check Console for errors
- Use React DevTools extension

**Backend Functions**:
- View logs in the backend interface
- Check Network tab for Edge Function responses
- Add `console.log()` statements (visible in backend logs)

**Database**:
- Use the database viewer
- Run queries directly in the backend interface

## Deployment

### Production Deployment

1. Build the application for production
2. Deploy to your hosting provider
3. Configure environment variables on your hosting platform

### Custom Domain

1. Configure your domain DNS settings
2. Point to your hosting provider
3. SSL certificates are provisioned automatically by most hosting platforms

## Additional Resources

- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Supabase Documentation](https://supabase.com/docs)

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request


