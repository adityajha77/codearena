const { Connection, PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");
const { Program, AnchorProvider, BN } = require("@coral-xyz/anchor");
const fs = require("fs");

const idl = JSON.parse(fs.readFileSync("./src/lib/code_arena_v2.json", "utf8"));
const connection = new Connection("https://api.devnet.solana.com");
const userPubkey = new PublicKey("6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam");

async function check() {
    const provider = new AnchorProvider(connection, {
        publicKey: userPubkey,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
    }, {});

    const program = new Program(idl, provider);
    const challengeId = Date.now().toString().substring(0, 32);
    
    const [challengePoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("challenge_pool"), Buffer.from(challengeId)],
        program.programId
    );
    
    const [participantRecordPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("participant"), challengePoolPDA.toBuffer(), userPubkey.toBuffer()],
        program.programId
    );

    const initIx = await program.methods.initializePool(
        challengeId,
        new BN(100000000), // 0.1 SOL
        30,
        true
    ).accounts({
        challengePool: challengePoolPDA,
        creator: userPubkey,
        oracle: userPubkey,
        beneficiary: userPubkey,
        systemProgram: SystemProgram.programId,
    }).instruction();

    const joinIx = await program.methods.joinChallenge()
    .accounts({
        challengePool: challengePoolPDA,
        participantRecord: participantRecordPDA,
        user: userPubkey,
        systemProgram: SystemProgram.programId,
    }).instruction();

    const tx = new Transaction().add(initIx, joinIx);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = userPubkey;

    console.log("Simulating transaction...");
    const sim = await connection.simulateTransaction(tx);
    console.log("Logs:", sim.value.logs);
    console.log("Err:", sim.value.err);
}

check();
