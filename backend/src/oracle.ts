import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import idl from './code_arena_v2.json';
import dotenv from 'dotenv';

dotenv.config();

// The Master Wallet Secret Key (Read from environment variables)
const SECRET_KEY_STR = process.env.ORACLE_SECRET_KEY;
if (!SECRET_KEY_STR) {
  throw new Error("ORACLE_SECRET_KEY not found in .env");
}
const SECRET_KEY = Uint8Array.from(JSON.parse(SECRET_KEY_STR));
const masterWallet = Keypair.fromSecretKey(SECRET_KEY);

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Helper to derive PDA seeds (Matches frontend and Rust logic)
const getChallengePoolPDA = (challengeId: string) => {
  const cleanId = challengeId.replace(/-/g, '');
  return PublicKey.findProgramAddressSync(
    [Buffer.from("challenge_pool"), Buffer.from(cleanId)],
    new PublicKey((idl as any).address)
  )[0];
};

const getParticipantRecordPDA = (challengePool: PublicKey, userPubkey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), challengePool.toBuffer(), userPubkey.toBuffer()],
    new PublicKey((idl as any).address)
  )[0];
};

export const applyPenaltyOnChain = async (
  challengeId: string, 
  participantWallet: string,
  beneficiaryWallet: string
) => {
  try {
    console.log(`🚀 Triggering On-Chain Slash for ${participantWallet}...`);
    
    const provider = new AnchorProvider(connection, new Wallet(masterWallet), { commitment: "confirmed" });
    const program = new Program(idl as any, provider);

    const challengePoolPDA = getChallengePoolPDA(challengeId);
    const participantPubkey = new PublicKey(participantWallet);
    const participantRecordPDA = getParticipantRecordPDA(challengePoolPDA, participantPubkey);
    const beneficiaryPubkey = new PublicKey(beneficiaryWallet);

    const tx = await program.methods.applyPenalty()
      .accounts({
        challengePool: challengePoolPDA,
        participantRecord: participantRecordPDA,
        oracle: masterWallet.publicKey,
        beneficiary: beneficiaryPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Successfully slashed ${participantWallet} on-chain! Tx: ${tx}`);
    return tx;
  } catch (error) {
    console.error(`❌ Failed to slash ${participantWallet} on-chain:`, error);
    throw error;
  }
};
