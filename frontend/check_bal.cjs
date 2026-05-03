const { Connection, PublicKey } = require("@solana/web3.js");
const connection = new Connection("https://api.devnet.solana.com");
const address = new PublicKey("6mVNBR3QPCzmVPPs6oazBGVfdMBFdtqcsyBxhxDanUam");

async function check() {
    const balance = await connection.getBalance(address);
    console.log("Balance on Devnet:", balance / 1e9, "SOL");
}
check();
