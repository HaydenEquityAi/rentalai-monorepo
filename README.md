# RentalAi Frontend

A modern property management platform built with Next.js 14, TypeScript, and AI-powered features.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **API Client**: Axios + TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/       # Dashboard routes (protected)
│   │   ├── dashboard/
│   │   ├── properties/
│   │   ├── ai/
│   │   └── layout.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── api.ts            # API client & endpoints
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions
```

## 🛠️ Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create `.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_APP_NAME=RentalAi
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Key Features

### Dashboard
- Portfolio overview with key metrics
- Interactive charts and analytics
- Recent activity feed
- Responsive design

### Property Management
- Property listing and details
- Unit management
- Amenities tracking
- Location-based organization

### AI Document Parser
- Upload lease documents (PDF/DOCX)
- Automatic data extraction
- Confidence scoring
- Manual review and editing

### Authentication
- Secure login/logout
- Token-based authentication
- Protected routes
- Demo credentials available

## 🔧 API Integration

The frontend connects to a backend API running on `http://localhost:8000/api/v1` with the following endpoints:

- **Auth**: `/auth/login`, `/auth/me`
- **Properties**: `/properties/`
- **Analytics**: `/analytics/portfolio`
- **AI**: `/ai/parse-lease`

## 🎨 UI Components

Built with shadcn/ui components:
- Button, Card, Input, Label
- Responsive design
- Dark mode support
- Customizable themes

## 📱 Responsive Design

- Mobile-first approach
- Collapsible sidebar navigation
- Touch-friendly interfaces
- Optimized for all screen sizes

## 🚀 Deployment

Ready for deployment on:
- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

## 📄 License

Private - RentalAi Platform
