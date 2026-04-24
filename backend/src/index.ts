import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Check required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY! Database operations will fail.");
}
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.warn("⚠️  Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET! GitHub OAuth will fail.");
}

// Initialize Supabase client
let supabase: any;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --------------------------------------------------------------------------
// 1. GitHub OAuth Flow
// --------------------------------------------------------------------------

// Route 1: Redirect user to GitHub
app.get('/api/auth/github', (req, res) => {
  const { wallet } = req.query;
  
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).send('Missing wallet address');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.BACKEND_URL || `http://localhost:${PORT}`}/api/auth/github/callback`;
  
  // We pass the wallet address as the "state" variable so GitHub sends it back to us
  const state = Buffer.from(wallet).toString('base64');
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
  
  res.redirect(githubAuthUrl);
});

// Route 2: GitHub redirects back here with a code
app.get('/api/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || typeof code !== 'string') return res.status(400).send('Missing code');
  if (!state || typeof state !== 'string') return res.status(400).send('Missing state');

  try {
    // 1. Decode wallet address from state
    const walletAddress = Buffer.from(state, 'base64').toString('ascii');

    // 2. Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error("Failed to get access token");

    // 3. Fetch user's GitHub profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const githubHandle = userResponse.data.login;

    if (!githubHandle) throw new Error("No GitHub username found");

    // 4. Save to Supabase securely 
    const { error } = await supabase.from('user_profiles').upsert({
      wallet_address: walletAddress,
      github: githubHandle
    }, { onConflict: 'wallet_address' });

    if (error) {
       // If unique constraint fails (someone else linked this github), it throws error 23505
       if (error.code === '23505') {
          return res.redirect(`${FRONTEND_URL}/profile?error=github_claimed`);
       }
       throw error;
    }

    // 5. Redirect back to frontend profile
    res.redirect(`${FRONTEND_URL}/profile?success=github`);

  } catch (error: any) {
    console.error("GitHub Auth Error:", error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/profile?error=github_auth_failed`);
  }
});


// Health Check
app.get('/health', (req, res) => {
  res.send('CodeArena Backend is running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server listening on port ${PORT}`);
});
