<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" alt="Solana Logo" width="100"/>
  <h1>CodeArena 🎮</h1>
  <p><b>A Web3 Coding Streak & Staking Platform built on Solana</b></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)]()
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)]()
  [![Solana](https://img.shields.io/badge/Solana-14F195?style=for-the-badge&logo=solana&logoColor=black)]()

</div>

---

## 🚀 Welcome to the Arena
**CodeArena** is a Web3 platform designed to help developers build unbreakable coding habits. By connecting your favorite competitive programming profiles (GitHub, LeetCode, Codeforces) and staking real **SOL**, you put your money where your keyboard is. 

Solve a problem every day to maintain your streak and earn your stake back (plus rewards). Miss a day, and your stake is slashed and distributed to the winners!

## 📺 Live Demo
<div align="center">
  <a href="https://www.youtube.com/watch?v=jgXaOpijyO4">
    <img src="https://img.youtube.com/vi/jgXaOpijyO4/maxresdefault.jpg" alt="CodeArena Demo Video" width="100%">
  </a>
  <p><i>Click the image above to watch the full platform walkthrough on YouTube!</i></p>
</div>

## ⚡ Core Features

- **🏆 The Hall of Glory:** A permanent record of achievement. Only users who complete 100% of their challenge days earn a spot in this golden history.
- **💰 SOL Saved Tracker:** A new premium statistic that tracks exactly how much SOL a user has successfully protected and claimed back through their consistency.
- **🥳 Global Group Victory:** Smart detection for multi-participant challenges. When every participant finishes and claims, the challenge transforms into a "Group Victory" celebration state for everyone.
- **🛡️ Visual Penalty Feedback:** Real-time on-screen alerts for strikes and slashes. Users can see their "Protected", "Slashed (50%)", or "Eliminated" status instantly on their dashboard.
- **🔗 Viral Social Hooks:** One-click Twitter sharing for both individual milestones and overall Hall of Glory collections, with embedded platform links to drive growth.
- **🌐 Cross-Platform Verification:** Instantly pull your live problem-solving data from **GitHub**, **LeetCode**, and **Codeforces**. 

## 🤖 Social & Automation
- **📱 Telegram Bot Integration:** Connect your Telegram account to receive automated alerts! The backend Node.js server runs a persistent cron job scheduler to send you daily reminders before the clock strikes midnight, and alerts you instantly if your stake gets slashed.
- **🐦 Twitter Show-Off:** Link your Twitter handle directly to your CodeArena profile. Easily share your coding streaks, challenge victories, and massive SOL payouts with your followers to build your personal brand.
- **⚙️ Automated Slashing Engine:** The backend scheduler checks participant streaks every 15 minutes. If a user fails to solve a problem before their 24-hour window expires, the engine automatically slashes their stake and prepares it for redistribution to the remaining survivors.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand
- **Web3 Integration:** `@solana/web3.js`, `@solana/wallet-adapter-react`
- **Backend / DB:** Supabase (PostgreSQL, Realtime Subscriptions)
- **Bots & Schedulers:** Node.js, Telegraf (Telegram Bot), node-cron

---

## 📦 Project Structure

```
codearena/
├── frontend/             # The React-based User Interface
│   ├── src/pages/        # Next-gen UI Pages (Profile, Challenges, Leaderboard)
│   ├── src/components/   # Reusable UI components & dialogs
│   ├── src/store/        # Zustand state management
│   └── src/lib/api/      # Platform verifications (LeetCode, GitHub, etc.)
├── backend/              # Node.js backend for Telegram Bots & Cron Jobs
│   ├── src/index.ts      # Server entry point
│   └── src/scheduler.ts  # Automated cron jobs for checking missed streaks
└── README.md
```

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- A Solana Wallet browser extension (Phantom, Solflare)
- A Supabase Project (with `challenges`, `challenge_participants`, `transactions`, and `notifications` tables created)

### 1. Frontend Setup
```bash
git clone https://github.com/adityajha77/codearena.git
cd codearena/frontend

# Install dependencies
npm install

# Create environment variables
echo "VITE_SUPABASE_URL=your_supabase_url" > .env.local
echo "VITE_SUPABASE_ANON_KEY=your_anon_key" >> .env.local

# Run the dev server
npm run dev
```

### 2. Backend Setup
```bash
cd ../backend

# Install dependencies
npm install

# Create environment variables
echo "SUPABASE_URL=your_supabase_url" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key" >> .env
echo "TELEGRAM_BOT_TOKEN=your_bot_token" >> .env

# Start the Node server (runs the Telegram Bot & Cron Scheduler)
npm run dev
```

## 🤝 Contributing
Contributions are always welcome! Whether it's adding a new platform API (HackerRank, AtCoder), enhancing the UI, or optimizing smart contract logic, feel free to open a Pull Request.

## 📄 License
This project is licensed under the MIT License.
