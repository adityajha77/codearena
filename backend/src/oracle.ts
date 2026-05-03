import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import idl from './code_arena_v2.json';
import dotenv from 'dotenv';

dotenv.config();

// The Master Wallet Secret Key (Keep this extremely secure!)
const SECRET_KEY = Uint8Array.from([179,84,239,99,114,68,138,179,31,254,13,87,226,147,237,122,69,22,62,9,102,133,55,29,83,91,93,206,156,177,158,199,250,99,65,66,244,98,79,200,118,174,74,82,146,115,15,125,71,37,182,88,102,191,53,215,239,63,37,143,93,169,192,37]);
const masterWallet = Keypair.fromSecretKey(SECRET_KEY);

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Helper to derive PDA seeds (Matches frontend and Rust logic)
const getChallengePoolPDA = (challengeId: string) => {
  const cleanId = challengeId.replace(/-/g, '');
  return PublicKey.findProgramAddressSync(
    [Buffer.from("challenge_pool"), Buffer.from(cleanId)],
    new PublicKey(idl.metadata.address)
  )[0];
};

const getParticipantRecordPDA = (challengePool: PublicKey, userPubkey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), challengePool.toBuffer(), userPubkey.toBuffer()],
    new PublicKey(idl.metadata.address)
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
