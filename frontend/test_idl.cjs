const { Program, AnchorProvider, BN } = require("@coral-xyz/anchor");
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");
const fs = require("fs");

const idl = JSON.parse(fs.readFileSync("./src/lib/code_arena_v2.json", "utf8"));
const connection = new Connection("https://api.devnet.solana.com");
const keypair = Keypair.generate();
const provider = new AnchorProvider(connection, {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
}, {});

try {
    const program = new Program(idl, provider);
    
    // Attempt to encode arguments
    program.methods.initializePool(
        "challenge123",
        new BN(100),
        30,
        true
    ).accounts({
        challengePool: keypair.publicKey,
        creator: keypair.publicKey,
        oracle: keypair.publicKey,
        beneficiary: keypair.publicKey,
        systemProgram: new PublicKey("11111111111111111111111111111111"),
    }).instruction().then(tx => console.log("Success!"))
    .catch(err => console.error("Error generating instruction:", err));
} catch (error) {
    console.error("Error generating instruction:", error);
}
