import fs from "fs";

// 🔧 Replace these with your token details
const ISSUER = "raaoPU9crbLGEFCMyh8moNH4gipsHJY3wN";
const CURRENCY = "MALLARD"; // currency code

// XRPL RPC endpoint
const XRPL_RPC = "https://xrplcluster.com"; 

// Fetch account_lines (trustlines + balances)
async function fetchXRPLStats() {
  let trustlines = [];
  let marker = null;

  do {
    const body = {
      method: "account_lines",
      params: [
        {
          account: ISSUER,
          ledger_index: "validated",
          limit: 400,
          marker: marker
        }
      ]
    };

    const resp = await fetch(XRPL_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!data.result || !data.result.lines) break;

    trustlines.push(...data.result.lines);
    marker = data.result.marker;
  } while (marker);

  // Filter for your token (HEX or plain code)
  const filtered = trustlines.filter(
    l => l.currency === CURRENCY || l.currency.startsWith("4D414C4C415244") // "MALLARD" hex
  );

  const trustlineCount = filtered.length;
  const holderCount = filtered.filter(l => parseFloat(l.balance) > 0).length;
  const supply = filtered.reduce((sum, l) => {
    const bal = parseFloat(l.balance || 0);
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  return { trustlineCount, holderCount, supply };
}

// Fetch price from DexScreener
async function fetchMarketCap(supply) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${ISSUER}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
      const priceUsd = parseFloat(data.pairs[0].priceUsd || 0);
      return priceUsd * supply;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function generateStats() {
  const xrplStats = await fetchXRPLStats();
  const marketcap = await fetchMarketCap(xrplStats.supply);

  const stats = {
    token: CURRENCY,
    issuer: ISSUER,
    trustlines: xrplStats.trustlineCount,
    holders: xrplStats.holderCount,
    circulating_supply: xrplStats.supply,
    marketcap_usd: marketcap,
    last_updated: new Date().toISOString()
  };

  fs.writeFileSync("stats.json", JSON.stringify(stats, null, 2));
  console.log("✅ stats.json updated:", stats);
}

generateStats();
