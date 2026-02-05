# AutoGradeX Frontend

AI-powered grading platform frontend built with Next.js 14, Tailwind CSS, and Shadcn/ui.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **State**: React Context

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your backend API URL.

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.js          # Root layout
│   ├── page.js            # Landing page
│   ├── signin/            # Sign in page
│   ├── signup/            # Sign up page
│   ├── forgot-password/   # Password reset
│   ├── instructor/        # Instructor dashboard
│   ├── student/           # Student dashboard
│   └── not-found.js       # 404 page
├── components/
│   └── ui/                # Shadcn/ui components
├── lib/
│   ├── api-client.js      # Backend API client
│   ├── validation.js      # Zod validation schemas
│   └── utils.js           # Utility functions
├── hooks/
│   └── use-toast.js       # Toast notifications
└── public/                # Static assets
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `http://localhost:3000` |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
