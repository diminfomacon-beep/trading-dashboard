const API_KEY = "d7ul6g9r01qnv95o1750d7ul6g9r01qnv95o175g";


let symbols = ["AAPL", "TSLA", "MSFT"];
let balance = 10000;

let positions = [];

// ADD STOCK
function addSymbol() {
  const input = document.getElementById("symbolInput");

  if (!input) {
    console.log("Input not found");
    return;
  }

  const symbol = input.value.trim().toUpperCase();

  if (symbol && !symbols.includes(symbol)) {
    symbols.push(symbol);
    renderWatchlist();
  }

  input.value = "";
}

// FETCH STOCK
async function getStock(symbol) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
    );

    return await res.json();
  } catch (err) {
    console.log("API error:", err);
    return { c: 0, d: 0, dp: 0 };
  }
}

// RENDER WATCHLIST
async function renderWatchlist() {
  const table = document.getElementById("watchlist");

  if (!table) {
    console.log("watchlist table not found");
    return;
  }

  table.innerHTML = "";

  const results = await Promise.all(
    symbols.map(s => getStock(s))
  );

  results.forEach((data, i) => {
    const symbol = symbols[i];

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${symbol}</td>
      <td>$${data.c}</td>
      <td>${data.d} (${data.dp}%)</td>
      <td><button onclick="removeSymbol('${symbol}')">Remove</button></td>
    `;

    table.appendChild(row);
  });
}

// REMOVE STOCK
function removeSymbol(symbol) {
  symbols = symbols.filter(s => s !== symbol);
  renderWatchlist();
}

async function getPrice() {
  const symbol = document
    .getElementById("symbol")
    .value
    .trim()
    .toUpperCase();

  const priceElement = document.getElementById("price");

  if (!symbol) {
    priceElement.innerText = "Enter a symbol";
    return;
  }

  try {
    const data = await getStock(symbol);

    priceElement.innerText =
      `${symbol}: $${data.c} (${data.dp}%)`;

  } catch (err) {
    priceElement.innerText = "Error loading stock";
  }
}
async function buyStock() {

  const symbol = document
    .getElementById("tradeSymbol")
    .value
    .trim()
    .toUpperCase();

  const shares = parseInt(
    document.getElementById("tradeShares").value
  );

  if (!symbol || !shares) return;

  const data = await getStock(symbol);

  const price = data.c;

  const totalCost = price * shares;

  if (totalCost > balance) {
    alert("Not enough balance");
    return;
  }
const riskAmount = balance * 0.01;
const riskPerShare = 5; // example OR calculate dynamically

if (shares * riskPerShare > riskAmount) {
  alert("Trade rejected: risk too high");
  return;
}
  balance -= totalCost;

  positions.push({
    symbol,
    shares,
    entry: price
  });

  updateBalance();
  renderPositions();
}
async function renderPositions() {

  const table = document.getElementById("positions");

  table.innerHTML = "";

  for (let pos of positions) {

    const data = await getStock(pos.symbol);

    const current = data.c;

    const profit =
      (current - pos.entry) * pos.shares;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${pos.symbol}</td>
      <td>${pos.shares}</td>
      <td>$${pos.entry.toFixed(2)}</td>
      <td>$${current.toFixed(2)}</td>
      <td>$${profit.toFixed(2)}</td>
    `;

    table.appendChild(row);
  }
}
function updateBalance() {
  document.getElementById("balance")
    .innerText = balance.toFixed(2);
}
setInterval(() => {
  renderWatchlist();
  renderPositions();
}, 10000);
function calculateRisk() {

  const entry = parseFloat(
    document.getElementById("riskEntry").value
  );

  const stop = parseFloat(
    document.getElementById("riskStop").value
  );

  let balanceInput = document.getElementById("riskBalance").value;

  const balanceToUse = balanceInput
    ? parseFloat(balanceInput)
    : balance;

  if (!entry || !stop || stop >= entry) {
    document.getElementById("riskResult").innerText =
      "Invalid inputs (stop must be below entry)";
    return;
  }

  // 1% risk rule
  const riskAmount = balanceToUse * 0.01;

  const riskPerShare = entry - stop;

  const shares = Math.floor(riskAmount / riskPerShare);

  const maxLoss = shares * riskPerShare;

  document.getElementById("riskResult").innerText =
    `Buy up to ${shares} shares | Max Loss: $${maxLoss.toFixed(2)}`;
}

// INIT (IMPORTANT)
window.onload = function () {
  renderWatchlist();
};
