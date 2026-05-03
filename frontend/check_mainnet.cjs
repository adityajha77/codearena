const { Connection, PublicKey } = require("@solana/web3.js");
const connection = new Connection("https://api.mainnet-beta.solana.com");
const address = new PublicKey("4T9ro5tXuCa28prJ3uLkGvRHbj3mqVRbwNP8wqZyyMZt");

async function check() {
    const info = await connection.getAccountInfo(address);
    if (info) {
        console.log("Account exists on MAINNET!");
        console.log("Owner:", info.owner.toBase58());
    } else {
        console.log("Account DOES NOT exist on Mainnet.");
    }
}
check();
