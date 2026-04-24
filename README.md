# CodeArena 🎮

CodeArena is a Solana-powered coding challenge platform where developers can stake SOL, compete in coding challenges, and build consistent habits. By integrating with popular platforms like GitHub, LeetCode, and Codeforces, CodeArena verifies your progress and rewards your consistency.

## 🚀 Key Features

- **Dynamic Challenges**: Join Community, Friends, or Private (Self) challenges.
- **Staking System**: Stake SOL to join challenges. Successful completion saves your stake; failure redistributes it.
- **Real-Time Verification**: Instant verification of coding activity via GitHub, LeetCode, and Codeforces APIs.
- **Interactive Dashboard**: Track your active challenges with live countdown timers.
- **Profile & Streaks**: Visualize your coding journey with a streak heatmap and earn badges for achievements.
- **Leaderboards**: Compete with others and see who's top of the arena.
- **Notifications**: Stay updated with challenge invites and status updates.
- **Transaction History**: Securely track all your staking and reward transactions.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion.
- **Blockchain**: Solana Web3.js, @solana/wallet-adapter.
- **Backend/Database**: Supabase.
- **State Management**: Zustand.

## 📦 Project Structure

- `frontend/`: The React-based user interface.
- `backend/`: Backend logic and API integrations (if any).
- `contracts/`: Solana smart contracts for staking and distribution.

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Solana wallet (e.g., Phantom, Solflare)
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/codearena.git
   cd codearena
   ```

2. Install dependencies for the frontend:
   ```bash
   cd frontend
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the `frontend` directory with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📜 Database Setup

To set up the necessary tables in Supabase, run the SQL scripts provided in the root directory:
- `supabase_transactions_table.sql`
- `supabase_update_profiles.sql`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
