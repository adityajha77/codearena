const { Connection, PublicKey } = require("@solana/web3.js");
const connection = new Connection("https://api.devnet.solana.com");
const address = new PublicKey("4T9ro5tXuCa28prJ3uLkGvRHbj3mqVRbwNP8wqZyyMZt");

async function check() {
    const info = await connection.getAccountInfo(address);
    if (info) {
        console.log("Account exists!");
        console.log("Owner:", info.owner.toBase58());
        console.log("Data length:", info.data.length);
    } else {
        console.log("Account DOES NOT exist on Devnet.");
    }
}
check();
