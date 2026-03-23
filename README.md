# 🌿 FarmLink

A farm-to-table marketplace connecting **farmers**, **retailers**, and **buyers** in Kenya. Built with React, Firebase, and Google Maps.

## Features

- **Marketplace** — browse products by category or on an interactive map
- **Seller Dashboard** — manage listings, orders, analytics, and customer messaging
- **Buyer Dashboard** — track orders, manage wishlist, saved addresses
- **Admin Panel** — moderate products, manage users
- **Real-time Chat** — direct messaging between buyers and sellers
- **Order Management** — full lifecycle from placement to fulfillment
- **PDF/CSV Export** — download order reports
- **Email Notifications** — via Resend or Brevo

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project
- A [Google Maps Platform](https://console.cloud.google.com/) API key

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/farmlink.git
   cd farmlink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Firebase credentials, Google Maps key, and email provider keys.

4. **Deploy Firestore security rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Create your first admin account**
   Sign up normally, then in the Firebase Console → Firestore, find your user document and set `role: "admin"`.

6. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See [.env.example](.env.example) for a full list of required and optional variables.

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web API key |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_GOOGLE_MAPS_PLATFORM_KEY` | ✅ | Google Maps API key |
| `RESEND_API_KEY` | Recommended | Email via Resend |
| `BREVO_API_KEY` | Optional | Email via Brevo (fallback) |
| `VITE_ADMIN_EMAILS` | Optional | Comma-separated emails auto-promoted to admin on first login |

## User Roles

| Role | Can Do |
|---|---|
| **Farmer** | List products, manage orders, view analytics |
| **Retailer** | Same as farmer |
| **Buyer** | Browse, purchase, review |
| **Admin** | Moderate products, manage all users |

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Express.js + Vite middleware
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **Maps**: Google Maps via `@vis.gl/react-google-maps`
- **Email**: Resend + Brevo fallback
- **Charts**: Recharts
- **Animation**: Motion (Framer Motion)
