import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./code_arena_v2.json";

export const PROGRAM_ID = new PublicKey("9s1cWuVPtRUHxcf2iV5JgButwwkqx2qXx8kpx2HfhbGh");

export const getProgram = (provider: AnchorProvider) => {
  return new Program(idl as unknown as Idl, provider);
};

export const getChallengePoolPDA = (challengeId: string) => {
  // Ensure we strip hyphens to stay under 32 bytes for the seed
  const cleanId = challengeId.replace(/-/g, '');
  return PublicKey.findProgramAddressSync(
    [Buffer.from("challenge_pool"), Buffer.from(cleanId)],
    PROGRAM_ID
  )[0];
};

export const getParticipantRecordPDA = (challengePool: PublicKey, userPubkey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), challengePool.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  )[0];
};
