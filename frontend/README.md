# CodeArena Frontend 💻

This is the frontend of the CodeArena platform, built with React, Vite, and Tailwind CSS. It interacts with the Solana blockchain and Supabase to provide a seamless experience for coding challenges and staking.

## 🚀 Features

- **Wallet Integration**: Support for various Solana wallets via `@solana/wallet-adapter`.
- **Responsive UI**: A sleek, modern dashboard that works on all devices.
- **Real-Time Timers**: Countdown timers for active challenges.
- **Data Visualization**: Heatmaps and charts for tracking progress.
- **State Persistence**: Zustand with persistence for a smooth user experience.

## 🛠 Available Scripts

In the `frontend` directory, you can run:

### `npm run dev`
Runs the app in development mode at `http://localhost:8080`.

### `npm run build`
Builds the app for production to the `dist` folder.

### `npm run lint`
Runs ESLint to check for code quality issues.

### `npm run test`
Runs the test suite using Vitest.

## 🔧 Environment Variables

Ensure you have the following in your `.env.local`:
- `VITE_SUPABASE_URL`: Your Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.

## 📁 Directory Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application views.
- `src/store`: Zustand state management.
- `src/lib/api`: API interaction logic for GitHub, LeetCode, etc.
- `src/hooks`: Custom React hooks.
- `src/assets`: Images and icons.

## 🧪 Testing

We use Vitest and React Testing Library for testing. Run `npm run test` to execute the tests.
