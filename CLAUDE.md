# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev --turbopack`: Start development server with Turbopack for faster builds
- `npm run build`: Build the production application
- `npm start`: Start the production server
- `npm run lint`: Run ESLint to check code quality

## Project Architecture

This is a Next.js 15 application using the App Router pattern with TypeScript. The application is an intelligence feed called "Seer" that provides AI-powered insights on tech developments.

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Database**: Supabase integration
- **Icons**: Lucide React
- **Font**: Inter with system fallbacks

### Project Structure
- `app/`: Contains all pages and layouts using App Router
  - `layout.tsx`: Root layout with sidebar and main content area
  - `page.tsx`: Main intelligence feed page
  - `personalize/`: User onboarding flow
  - `chat/`: AI-powered chat interface
  - `settings/`: User preferences and settings
- `components/`: Reusable UI components
  - `app-sidebar.tsx`: Main navigation sidebar
  - `ui/`: shadcn/ui component library
- `lib/`: Utility functions and configurations
  - `supabaseClient.ts`: Supabase client setup
  - `utils.ts`: Common utility functions
- `instructions/`: Development documentation and specifications

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Key Features
1. **Intelligence Feed**: Displays curated tech stories organized in sections
2. **Personalization**: Multi-step onboarding to customize user experience
3. **AI Chat**: Interactive chat interface for tech insights
4. **Sidebar Navigation**: Consistent navigation across all pages

### Design System
- Uses HSL color variables defined in CSS custom properties
- Supports dark mode through class-based toggling
- Custom grid background pattern
- Responsive design with container queries
- Animation support via tailwindcss-animate

### Component Patterns
- Uses TypeScript strict mode
- Follows React 19 patterns
- Implements shadcn/ui component architecture
- Uses `cn()` utility for conditional class names
- Exports components as default with proper typing

The application follows a standard Next.js App Router structure with server and client components appropriately separated.