const { Program, AnchorProvider, BN } = require("@coral-xyz/anchor");
const { PublicKey, Connection, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

const idl = JSON.parse(fs.readFileSync("./src/lib/code_arena_v2.json", "utf8"));
const connection = new Connection("https://api.devnet.solana.com");
const keypair = Keypair.generate();

const provider = new AnchorProvider(connection, {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => { tx.partialSign(keypair); return tx; },
    signAllTransactions: async (txs) => txs,
}, { commitment: "processed" });

async function main() {
    try {
        console.log("Airdropping 1 SOL...");
        const airdropSignature = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSignature);
        console.log("Airdrop complete!");

        const program = new Program(idl, provider);
        const challengeId = Date.now().toString().substring(0, 32);
        
        const [challengePoolPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("challenge_pool"), Buffer.from(challengeId)],
            program.programId
        );
        
        const [participantRecordPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("participant"), challengePoolPDA.toBuffer(), keypair.publicKey.toBuffer()],
            program.programId
        );

        const initIx = await program.methods.initializePool(
            challengeId,
            new BN(10000000), // 0.01 SOL
            30,
            true
        ).accounts({
            challengePool: challengePoolPDA,
            creator: keypair.publicKey,
            oracle: keypair.publicKey,
            beneficiary: keypair.publicKey,
            systemProgram: SystemProgram.programId,
        }).instruction();

        const joinIx = await program.methods.joinChallenge()
        .accounts({
            challengePool: challengePoolPDA,
            participantRecord: participantRecordPDA,
            user: keypair.publicKey,
            systemProgram: SystemProgram.programId,
        }).instruction();

        const tx = new Transaction().add(initIx, joinIx);
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = keypair.publicKey;
        
        tx.sign(keypair);

        const simulation = await connection.simulateTransaction(tx);
        console.log("Simulation Result:", JSON.stringify(simulation.value, null, 2));
    } catch (e) {
        console.error(e);
    }
}
main();
