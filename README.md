# MailForge — Bulk Email Campaign Platform

A complete, production-ready bulk email campaign platform built with React + Supabase.

---

## ✨ Features

- 🔐 **Auth** — Secure login/signup via Supabase Auth
- 📊 **Dashboard** — Live stats, charts, campaign overview
- 📧 **Campaigns** — Create, launch, and manage email campaigns
- 👥 **Contacts** — Upload CSV/Excel contact lists with drag & drop
- 📝 **Templates** — Reusable email templates with `{{name}}` placeholders
- 📋 **Logs** — Full audit trail with filtering and CSV export
- ⚙️ **Settings** — Email provider config (SendGrid, AWS SES), sending limits

---

## 🚀 Getting Started

### Step 1 — Install Dependencies

```bash
npm install
```

### Step 2 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and paste the contents of `supabase/schema.sql` — run it
4. Go to **Settings → API** and copy your **Project URL** and **anon key**

### Step 3 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4 — Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
src/
  pages/           → All page components
    LoginPage.jsx
    DashboardPage.jsx
    CampaignsPage.jsx
    ContactsPage.jsx
    TemplatesPage.jsx
    LogsPage.jsx
    SettingsPage.jsx
  components/
    shared/
      Layout.jsx   → Sidebar + navigation
  hooks/
    useAuth.jsx    → Auth context & hooks
  lib/
    supabase.js    → Supabase client
  styles/
    global.css     → Design system & global styles
supabase/
  schema.sql       → Database schema (run in Supabase SQL Editor)
```

---

## 🔌 Email Sending Setup

The frontend is complete. To actually send emails, you need a small backend worker:

### Option A — SendGrid (Easiest)
1. Create account at sendgrid.com
2. Get API key from Settings → API Keys
3. Add it in MailForge Settings → Email Provider

### Option B — Amazon SES (Cheapest at scale)
1. Create AWS account
2. Verify your domain in SES
3. Create IAM user with SES permissions
4. Add credentials in MailForge Settings

### Worker Service (Required for actual sending)
Create a simple Node.js worker on Railway/Render:
```js
// worker/index.js
const { createClient } = require('@supabase/supabase-js')
const sgMail = require('@sendgrid/mail')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Poll for pending campaigns and send emails
// See docs for full implementation
```

---

## 📧 Contact List Format

Your CSV/Excel file must have these columns:
| email | name |
|-------|------|
| john@example.com | John Doe |
| jane@example.com | Jane Smith |

---

## 🎨 Design System

- **Font**: Syne (display) + DM Sans (body)
- **Theme**: Dark with purple accent (#6c63ff)
- **Framework**: Pure CSS with CSS variables (no Tailwind needed)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
| File Parsing | PapaParse + SheetJS |
| Routing | React Router v6 |
| Notifications | React Hot Toast |

---

## 📦 Build for Production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

Built with ❤️ — MailForge Bulk Email Platform
