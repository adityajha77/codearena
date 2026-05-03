const crypto = require("crypto");
const fs = require("fs");

function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function getDiscriminator(name) {
    const snakeName = toSnakeCase(name);
    console.log(`Calculating for: global:${snakeName}`);
    return Array.from(
        crypto.createHash("sha256").update(`global:${snakeName}`).digest().slice(0, 8)
    );
}

const idl = JSON.parse(fs.readFileSync("./src/lib/code_arena_v2.json", "utf8"));

for (let ix of idl.instructions) {
    ix.discriminator = getDiscriminator(ix.name);
}

fs.writeFileSync("./src/lib/code_arena_v2.json", JSON.stringify(idl, null, 2));
console.log("Injected CORRECT snake_case discriminators into IDL!");
