const { Connection, PublicKey } = require("@solana/web3.js");
const connection = new Connection("https://api.devnet.solana.com");
const programId = new PublicKey("9s1cWuVPtRUHxcf2iV5JgButwwkqx2qXx8kpx2HfhbGh");

async function check() {
    const info = await connection.getAccountInfo(programId);
    if (info) {
        console.log("Program exists on DEVNET!");
        console.log("Is executable:", info.executable);
    } else {
        console.log("Program DOES NOT exist on Devnet.");
    }
}
check();
