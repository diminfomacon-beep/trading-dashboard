const API_KEY = "d7ul6g9r01qnv95o1750d7ul6g9r01qnv95o175g";


let symbols = ["AAPL", "TSLA", "MSFT"];
let balance = 10000;
let journal = [];
let positions = [];
let equityHistory = [];

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

  const stopLoss = parseFloat(
    document.getElementById("tradeStop").value
  );

  if (!symbol || !shares || !stopLoss) return;

  const data = await getStock(symbol);
  const price = data.c;

  const totalCost = price * shares;

  // 1. BALANCE CHECK
  if (totalCost > balance) {
    alert("Not enough balance");
    return;
  }

  // 2. REAL RISK CALCULATION
  const riskAmount = balance * 0.01; // 1% rule

  const riskPerShare = price - stopLoss;

  if (riskPerShare <= 0) {
    alert("Stop-loss must be below entry price");
    return;
  }

  const totalRisk = riskPerShare * shares;

  // 3. RISK VALIDATION
  if (totalRisk > riskAmount) {
    alert(
      `Trade rejected.\nRisk: $${totalRisk.toFixed(2)} exceeds allowed $${riskAmount.toFixed(2)}`
    );
    return;
  }

  // 4. EXECUTE TRADE
  balance -= totalCost;

  positions.push({
    symbol,
    shares,
    entry: price,
    stopLoss: stopLoss
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
async function checkStopLosses() {

  for (let i = positions.length - 1; i >= 0; i--) {

    const pos = positions[i];
    const data = await getStock(pos.symbol);
    const price = data.c;

    if (price <= pos.stopLoss) {

      const profit = (price - pos.entry) * pos.shares;

      balance += price * pos.shares;

      // 🧠 ADD TO JOURNAL
      journal.push({
        symbol: pos.symbol,
        entry: pos.entry,
        exit: price,
        shares: pos.shares,
        pl: profit,
        result: profit >= 0 ? "LOSS (STOP HIT)" : "LOSS"
      });

      positions.splice(i, 1);

      alert(`${pos.symbol} STOP LOSS HIT`);
    }
  }

  updateBalance();
  renderPositions();
  renderJournal();
}

function renderJournal() {

  const table = document.getElementById("journal");
  table.innerHTML = "";

  journal.forEach(trade => {

    const row = document.createElement("tr");

    const resultColor =
      trade.pl >= 0 ? "green" : "red";

    row.innerHTML = `
      <td>${trade.symbol}</td>
      <td>$${trade.entry.toFixed(2)}</td>
      <td>$${trade.exit.toFixed(2)}</td>
      <td>${trade.shares}</td>
      <td style="color:${resultColor}">
        $${trade.pl.toFixed(2)}
      </td>
      <td>${trade.result}</td>
    `;

    table.appendChild(row);
  });
}
function analyzeMistakes() {

  const insights = [];

  if (journal.length === 0) {
    document.getElementById("insights").innerText =
      "No trades yet to analyze.";
    return;
  }

  let totalLoss = 0;
  let totalWin = 0;
  let wins = 0;
  let losses = 0;

  journal.forEach(t => {
    if (t.pl >= 0) {
      wins++;
      totalWin += t.pl;
    } else {
      losses++;
      totalLoss += t.pl;
    }
  });

  const winRate = (wins / journal.length) * 100;

  // 🧠 RULE 1: Low win rate
  if (winRate < 40) {
    insights.push("⚠️ Low win rate — you may be entering low-quality setups.");
  }

  // 🧠 RULE 2: Losses larger than wins
  if (Math.abs(totalLoss) > totalWin) {
    insights.push("⚠️ Your losses are larger than your wins — improve risk control.");
  }

  // 🧠 RULE 3: Overtrading detection
  if (journal.length > 10) {
    const last5 = journal.slice(-5);
    const allLosses = last5.every(t => t.pl < 0);

    if (allLosses) {
      insights.push("⚠️ Possible revenge trading or emotional trading detected.");
    }
  }

  // 🧠 RULE 4: Cutting winners too early
  const avgWin = totalWin / (wins || 1);
  const avgLoss = Math.abs(totalLoss / (losses || 1));

  if (avgWin < avgLoss) {
    insights.push("⚠️ You are letting losses run longer than winners.");
  }

  // DISPLAY RESULTS
  const panel = document.getElementById("insights");

  panel.innerHTML = insights.length
    ? insights.map(i => `<p>${i}</p>`).join("")
    : "<p>✅ No major mistakes detected yet. Keep trading with discipline.</p>";
}
let equityChart;

function initEquityChart() {

  const ctx = document.getElementById("equityChart").getContext("2d");

  equityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Account Balance",
        data: [],
        borderColor: "green",
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}
function updateEquityCurve() {

  equityHistory.push(balance);

  // keep it lightweight
  if (equityHistory.length > 50) {
    equityHistory.shift();
  }

  const labels = equityHistory.map((_, i) => i + 1);

  equityChart.data.labels = labels;
  equityChart.data.datasets[0].data = equityHistory;

  equityChart.update();
}

setInterval(async () => {

  // MARKET DATA UPDATES
  await renderWatchlist();

  // TRADING SYSTEM LOGIC
  await checkStopLosses();

  // UI UPDATES (run once)
  renderPositions();
  renderJournal();
  analyzeMistakes();
  updateEquityCurve();

}, 5000);

// INIT (IMPORTANT)
window.onload = function () {
  renderWatchlist();
  renderPositions();
  renderJournal();
  analyzeMistakes();
  initEquityChart();
};

