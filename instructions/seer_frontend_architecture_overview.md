# Seer Front-End Architecture Overview

This document outlines the structure of the Seer front-end application, built with Next.js and the App Router. It details the component architecture and specifies the expected backend APIs for each piece of functionality.

## 1. Core Structure

The application is organized into pages and reusable components.

- ``: Contains the main pages (routes) of the application.
  - `layout.tsx`: The root layout, which includes the main sidebar (`AppSidebar`) and establishes the overall page structure.
  - `page.tsx`: The main intelligence feed.
  - `personalize/page.tsx`: The user onboarding and personalization flow.
  - `chat/page.tsx`: The AI-powered chat interface.
  - `settings/page.tsx`: User settings and preferences.
- ``: Contains reusable UI components.
  - `app-sidebar.tsx`: The primary navigation sidebar.
  - `ui/`: shadcn/ui components (Button, Card, etc.).

## 2. Page Breakdown & API Integration

### 2.1. Feed Page (`app/page.tsx`)

This page displays curated stories for the user. It's designed to be dynamic and personalizable.

#### Components

- ``: The main component that orchestrates the page layout.
- ``: A reusable component that renders a horizontal row of stories for a specific category (e.g., "Top Picks").
- ``: A card that displays a single story's details.

#### Expected APIs

- ``: Fetches the story sections and the stories within them, personalized for the user.
  - **Request**: May include query params for pagination or filters.
  - **Response**: An array of section objects, where each object contains a title, icon, and an array of story objects.
    ```json
    [
      {
        "id": "top-picks",
        "title": "Top Picks",
        "icon": "Plus",
        "stories": [
          { "id": 1, "title": "...", "source": "...", "tags": [...] }
        ]
      }
    ]
    ```
- ``: Fetches the available options for the filter dropdowns.
  - **Response**: An object containing arrays for categories, impact levels, etc.
    ```json
    {
      "categories": ["Software Engineering", "Data Science"],
      "impact": ["High", "Medium"]
    }
    ```
- ``: Saves the user's custom order for the story sections.
  - **Request Body**: An array of section IDs in the new order.
    ```json
    { "order": ["software-eng", "top-picks", "data-science"] }
    ```

### 2.2. Personalization Page (`app/personalize/page.tsx`)

A multi-step flow to gather user preferences for better story curation.

#### Components

- ``: Manages the state of the multi-step form.

#### Expected APIs

- ``: Submits the user's completed personalization profile.
  - **Request Body**: An object containing the user's selected role, interests, and project priorities.
    ```json
    {
      "role": "Data Scientist",
      "interests": ["LLMs", "Computer Vision"],
      "priorities": "Building an agentic RAG pipeline..."
    }
    ```

### 2.3. Chat Page (`app/chat/page.tsx`)

An interface for users to ask questions and get AI-powered insights.

#### Components

- ``: Contains the chat input form and the display area for conversation history.

#### Expected APIs

- ``: Sends a user's message and receives a streamed response.
  - **Request Body**: The user's prompt and conversation history.
    ```json
    {
      "prompt": "What's new in MLOps this week?",
      "history": [...]
    }
    ```
  - **Response**: A server-sent event (SSE) stream with the AI's response.

### 2.4. Settings Page (`app/settings/page.tsx`)

Allows users to manage their profile, preferences, and notifications.

#### Components

- ``: A form-like layout with various controls.

#### Expected APIs

- ``: Fetches the user's current settings to populate the page.
  - **Response**: An object with the user's profile info and preferences.
- ``: Updates one or more user settings.
  - **Request Body**: An object with the setting(s) to be updated.
    ```json
    {
      "notifications": { "dailyDigest": true },
      "theme": "dark"
    }
    ```

