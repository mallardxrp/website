import fs from "fs";
import { Client } from "xrpl";

// Mallard config
const ISSUER = "raaoPU9crbLGEFCMyh8moNH4gipsHJY3wN";
const CURRENCY = "MALLARD";
const SUPPLY = 1000000000; // replace with real supply if needed

// XRPL public servers
const SERVERS = ["wss://xrplcluster.com", "wss://s1.ripple.com", "wss://s2.ripple.com"];

// Fetch trustlines + holders
async function getTrustlinesAndHolders(client) {
  let trustlines = 0;
  let holders = 0;
  let marker;

  do {
    const resp = await client.request({
      command: "account_lines",
      account: ISSUER,
      limit: 400,
      marker,
    });

    const lines = resp.result.lines || [];
    trustlines += lines.length;
    holders += lines.filter(l => parseFloat(l.balance) > 0).length;

    marker = resp.result.marker;
  } while (marker);

  return { trustlines, holders };
}

// Fake marketcap (for demo) → replace with DexScreener if available
async function getMarketCap() {
  // Example: price * supply
  const priceUsd = 0.0001; // replace with live fetch later
  return priceUsd * SUPPLY;
}

// Main
async function main() {
  let client;
  for (const server of SERVERS) {
    try {
      client = new Client(server);
      await client.connect();
      console.log("Connected to:", server);
      break;
    } catch (e) {
      console.log("Server failed:", server);
    }
  }

  if (!client) throw new Error("All XRPL servers failed");

  const { trustlines, holders } = await getTrustlinesAndHolders(client);
  const marketCap = await getMarketCap();

  await client.disconnect();

  const stats = {
    token: CURRENCY,
    issuer: ISSUER,
    trustlines,
    holders,
    supply: SUPPLY,         // ✅ renamed
    marketCap,              // ✅ renamed
    last_updated: new Date().toISOString(),
  };

  fs.writeFileSync("stats.json", JSON.stringify(stats, null, 2));
  console.log("✅ stats.json updated:", stats);
}

main().catch(e => {
  console.error("❌ Error:", e);
  process.exit(1);
});
