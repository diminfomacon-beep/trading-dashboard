const API_KEY = "d7ul6g9r01qnv95o1750d7ul6g9r01qnv95o175g";


let symbols = ["AAPL", "TSLA", "MSFT"];
let balance = 10000;
let journal = [];
let positions = [];
let equityHistory = [];
let peakBalance = 10000;
let tradingLocked = false;
let marketHistory = [];
let replayIndex = 0;
let isReplaying = false;
let isRecording = false;
let backtestBalance = 10000;
let backtestTrades = [];
let strategyConfig = {
  minChange: 0.5,
  minScore: 75,
  maxRisk: 1
};
let strategies = [
  {
    name: "Conservative",
    minChange: 1,
    minScore: 80,
    maxRisk: 0.5
  },
  {
    name: "Balanced",
    minChange: 0.5,
    minScore: 75,
    maxRisk: 1
  },
  {
    name: "Aggressive",
    minChange: 0.2,
    minScore: 60,
    maxRisk: 2
  }
];

const optimizerGrid = {
  minChange: [0.2, 0.5, 1],
  minScore: [60, 70, 80],
  maxRisk: [0.5, 1, 2]
};
const portfolioConfig = {
  maxExposurePercent: 50,   // max % of balance in open trades
  maxSinglePositionPercent: 20 // max % in one stock
};

function showTab(tab) {

  const sections = document.querySelectorAll(".tab");

  sections.forEach(s => {
    s.style.display = "none";
  });

  document.getElementById(tab).style.display = "block";
}

window.onload = () => {
  showTab("market");
};
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
  if (tradingLocked) {
    alert("Trading is locked due to drawdown protection.");
    return;
  }

  // 1. READ INPUTS FIRST
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

  // 2. GET MARKET PRICE
  const data = await getStock(symbol);
  const price = data.c;

  // 3. RUN STRATEGY CHECK (NOW VARIABLES EXIST)
  const strategy = checkStrategy(symbol, price, stopLoss, shares);

  document.getElementById("strategyStatus").innerText =
    strategy.reason;

  if (!strategy.allowed) {
    alert("TRADE BLOCKED: " + strategy.reason);
    return;
  }
  
  const exposure = price * shares;
    const exposurePercent = (exposure / balance) * 100;
    
    if (exposurePercent > portfolioConfig.maxSinglePositionPercent) {
      alert("Trade rejected: Position too large for portfolio risk rules.");
      return;
    }

  // 4. BALANCE CHECK
  const totalCost = price * shares;

  if (totalCost > balance) {
    alert("Not enough balance");
    return;
  }

  // 5. RISK CALCULATION
  const riskAmount = balance * (strategyConfig.maxRisk / 100);

  const riskPerShare = price - stopLoss;

  if (riskPerShare <= 0) {
    alert("Stop-loss must be below entry price");
    return;
  }

  const totalRisk = riskPerShare * shares;

  if (totalRisk > riskAmount) {
    alert(
      `Trade rejected.\nRisk: $${totalRisk.toFixed(2)} exceeds allowed $${riskAmount.toFixed(2)}`
    );
    return;
  }

  // 6. EXECUTE TRADE
  balance -= totalCost;

  positions.push({
    symbol,
    shares,
    entry: price,
    stopLoss: stopLoss,
    takeProfit: parseFloat(document.getElementById("tradeTakeProfit").value)
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
function updateStats() {

  if (journal.length === 0) return;

  let wins = 0;
  let losses = 0;
  let totalWin = 0;
  let totalLoss = 0;

  journal.forEach(t => {

    if (t.pl >= 0) {
      wins++;
      totalWin += t.pl;
    } else {
      losses++;
      totalLoss += t.pl;
    }
  });

  const totalTrades = journal.length;

  const winRate = (wins / totalTrades) * 100;

  const avgWin = wins ? totalWin / wins : 0;
  const avgLoss = losses ? totalLoss / losses : 0;

  const profitFactor =
    Math.abs(totalWin / (totalLoss || 1));

  const totalPL = totalWin + totalLoss;

  // Update UI
  document.getElementById("statTrades").innerText = totalTrades;
  document.getElementById("statWinRate").innerText = winRate.toFixed(1) + "%";
  document.getElementById("statPL").innerText = totalPL.toFixed(2);
  document.getElementById("statAvgWin").innerText = avgWin.toFixed(2);
  document.getElementById("statAvgLoss").innerText = avgLoss.toFixed(2);
  document.getElementById("statPF").innerText = profitFactor.toFixed(2);
}
function checkStrategy(symbol, price, stopLoss, shares) {

  const messages = [];

  // RULE 1: Stop loss must exist
  if (!stopLoss) {
    messages.push("Missing stop-loss");
  }

  // RULE 2: Risk must be valid
  const riskPerShare = price - stopLoss;
  if (riskPerShare <= 0) {
    messages.push("Stop-loss must be below entry");
  }

  const riskAmount = balance * 0.01;
  const totalRisk = riskPerShare * shares;

  if (totalRisk > riskAmount) {
    messages.push("Risk too high");
  }

  // RULE 3: Basic liquidity sanity check (simple proxy)
  if (price <= 0) {
    messages.push("Invalid price data");
  }

  // FINAL RESULT
  if (messages.length > 0) {
    return {
      allowed: false,
      reason: messages.join(" | ")
    };
  }

  return {
    allowed: true,
    reason: "Valid setup"
  };
}
async function checkTakeProfits() {

  for (let i = positions.length - 1; i >= 0; i--) {

    const pos = positions[i];
    const data = await getStock(pos.symbol);
    const price = data.c;

    if (!pos.takeProfit) continue;

    // TAKE PROFIT TRIGGER
    if (price >= pos.takeProfit) {

      const profit = (price - pos.entry) * pos.shares;

      balance += price * pos.shares;

      journal.push({
        symbol: pos.symbol,
        entry: pos.entry,
        exit: price,
        shares: pos.shares,
        pl: profit,
        result: "WIN (TAKE PROFIT)"
      });

      positions.splice(i, 1);

      alert(`${pos.symbol} TAKE PROFIT HIT 🎯`);
    }
  }

  updateBalance();
  renderPositions();
  renderJournal();
}
function calculateTradingScore() {

  if (journal.length === 0) {
    document.getElementById("tradingScore").innerText = "--";
    document.getElementById("scoreMessage").innerText =
      "No trades yet.";
    return;
  }

  let score = 100;

  let wins = 0;
  let losses = 0;
  let totalLoss = 0;
  let totalWin = 0;

  journal.forEach(t => {
    if (t.pl >= 0) {
      wins++;
      totalWin += t.pl;
    } else {
      losses++;
      totalLoss += t.pl;
    }
  });

  const totalTrades = journal.length;

  const winRate = wins / totalTrades;

  // ⚠️ RULE 1: Low win rate penalty
  if (winRate < 0.4) score -= 25;
  else if (winRate < 0.5) score -= 10;

  // ⚠️ RULE 2: Losses bigger than wins
  if (Math.abs(totalLoss) > totalWin) {
    score -= 20;
  }

  // ⚠️ RULE 3: Overtrading penalty
  if (journal.length > 15) {
    score -= 10;
  }

  // ⚠️ RULE 4: Consistency bonus/penalty
  const last5 = journal.slice(-5);
  const allLosses = last5.every(t => t.pl < 0);

  if (allLosses) {
    score -= 15;
  }

  // Clamp score
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // DISPLAY
  document.getElementById("tradingScore").innerText = score;

  let message = "";

  if (score >= 80) {
    message = "🟢 Excellent discipline. Keep following your system.";
  } else if (score >= 60) {
    message = "🟡 Decent, but inconsistent execution.";
  } else if (score >= 40) {
    message = "🟠 Poor discipline — focus on rules, not trades.";
  } else {
    message = "🔴 High risk behavior — stop overtrading and reset.";
  }

  document.getElementById("scoreMessage").innerText = message;
}
function updateDrawdownProtection() {

  // Update peak
  if (balance > peakBalance) {
    peakBalance = balance;
  }

  // Calculate drawdown
  const drawdown = peakBalance - balance;
  const drawdownPercent = (drawdown / peakBalance) * 100;

  // Update UI
  document.getElementById("peakBalance").innerText =
    peakBalance.toFixed(2);

  document.getElementById("drawdownPercent").innerText =
    drawdownPercent.toFixed(2) + "%";

  // RULE: lock trading if drawdown too high
  if (drawdownPercent >= 10) {
    tradingLocked = true;
    document.getElementById("drawdownStatus").innerText =
      "🚫 Trading Locked (Drawdown Limit Hit)";
  } else {
    tradingLocked = false;
    document.getElementById("drawdownStatus").innerText =
      "🟢 Trading Active";
  }
}
async function recordMarket() {

  if (!isRecording) return;

  const snapshot = [];

  for (let symbol of symbols) {
    const data = await getStock(symbol);

    snapshot.push({
      symbol,
      price: data.c,
      time: Date.now()
    });
  }

  marketHistory.push(snapshot);
}
function startRecording() {
  marketHistory = [];
  isRecording = true;
  replayIndex = 0;

  document.getElementById("replayStatus").innerText =
    "📡 Recording market data...";
}
function startReplay() {

  if (marketHistory.length === 0) {
    alert("No data recorded yet");
    return;
  }

  isRecording = false;
  isReplaying = true;
  replayIndex = 0;

  document.getElementById("replayStatus").innerText =
    "🔁 Replaying market...";
}
function runReplayStep() {

  if (!isReplaying) return;

  if (replayIndex >= marketHistory.length) {
    isReplaying = false;

    document.getElementById("replayStatus").innerText =
      "✅ Replay finished";

    return;
  }

  const snapshot = marketHistory[replayIndex];

  // Update watchlist with historical prices
  const table = document.getElementById("watchlist");
  table.innerHTML = "";

  snapshot.forEach(stock => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${stock.symbol}</td>
      <td>$${stock.price}</td>
      <td>REPLAY</td>
      <td>--</td>
    `;

    table.appendChild(row);
  });

  replayIndex++;
}
function resetReplay() {
  marketHistory = [];
  replayIndex = 0;
  isReplaying = false;
  isRecording = false;

  document.getElementById("replayStatus").innerText =
    "🔄 Reset complete";
}
async function runBacktest() {

  if (marketHistory.length === 0) {
    alert("No market data recorded");
    return;
  }

  document.getElementById("backtestStatus").innerText =
    "🧪 Running backtest...";

  backtestBalance = 10000;
  backtestTrades = [];

  let openPosition = null;

  for (let i = 0; i < marketHistory.length; i++) {

    const snapshot = marketHistory[i];

    for (let stock of snapshot) {

      const symbol = stock.symbol;
      const price = stock.price;

      // ======================
      // ENTRY RULE (BUY)
      // ======================
      const stopLoss = price * 0.98;     // 2% stop
      const takeProfit = price * 1.03;   // 3% target

      const strategy = checkStrategy(
        symbol,
        price,
        stopLoss,
        10
      );

      if (!openPosition && strategy.allowed) {

        openPosition = {
          symbol,
          entry: price,
          shares: 10,
          stopLoss,
          takeProfit
        };
      }

      // ======================
      // EXIT RULES
      // ======================
      if (openPosition && openPosition.symbol === symbol) {

        // STOP LOSS
        if (price <= openPosition.stopLoss) {

          const pl =
            (price - openPosition.entry) *
            openPosition.shares;

          backtestBalance += price * openPosition.shares;

          backtestTrades.push(pl);

          openPosition = null;
        }

        // TAKE PROFIT
        else if (price >= openPosition.takeProfit) {

          const pl =
            (price - openPosition.entry) *
            openPosition.shares;

          backtestBalance += price * openPosition.shares;

          backtestTrades.push(pl);

          openPosition = null;
        }
      }
    }
  }

  // FINAL RESULTS
  const wins = backtestTrades.filter(t => t > 0).length;
  const total = backtestTrades.length;

  const winRate = total ? (wins / total) * 100 : 0;

  const totalPL = backtestTrades.reduce((a, b) => a + b, 0);

  document.getElementById("btTrades").innerText = total;
  document.getElementById("btBalance").innerText = backtestBalance.toFixed(2);
  document.getElementById("btWinRate").innerText = winRate.toFixed(1) + "%";
  document.getElementById("btPL").innerText = totalPL.toFixed(2);

  document.getElementById("backtestStatus").innerText =
    "✅ Backtest complete";
}
async function evaluateSymbol(symbol) {

  const data = await getStock(symbol);
  const price = data.c;

  const changePercent = Math.abs(data.dp || 0);

  // ======================
  // 1. BASE SCORE (market behavior only)
  // ======================
  let score = 50;

  if (changePercent > 1) score += 20;
  if (changePercent > 0.5) score += 10;
  if (changePercent < 0.2) score -= 20;

  if (price < 5) score -= 15;

  // ======================
  // 2. STRATEGY ADJUSTMENT
  // ======================
  if (changePercent > strategyConfig.minChange) {
    score += 15;
  } else {
    score -= 10;
  }

  // ======================
  // 3. FINAL CLAMP
  // ======================
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // ======================
  // 4. SIGNAL DECISION (ONLY ON FINAL SCORE)
  // ======================
  let signal = "🔴 AVOID";

  if (score >= strategyConfig.minScore) {
    signal = "🟢 BUY SETUP";
  } else if (score >= 50) {
    signal = "🟡 WATCH";
  }

  return {
    symbol,
    price,
    score,
    signal
  };
}
async function generateSignals() {

  const container = document.getElementById("signals");
  container.innerHTML = "Scanning...";

  const results = [];

  for (let symbol of symbols) {
    const result = await evaluateSymbol(symbol);
    results.push(result);
  }

  container.innerHTML = "";

  results.forEach(r => {

    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${r.symbol}</h3>
      <p>Price: $${r.price}</p>
      <p>Score: ${r.score}</p>
      <p>${r.signal}</p>
      <hr>
    `;

    container.appendChild(div);
  });
}
function saveStrategy() {

  strategyConfig.minChange =
    parseFloat(document.getElementById("minChange").value) || 0.5;

  strategyConfig.minScore =
    parseFloat(document.getElementById("minScore").value) || 75;

  strategyConfig.maxRisk =
    parseFloat(document.getElementById("maxRisk").value) || 1;

  document.getElementById("strategyActive").innerText =
    `Active Strategy → Change %: ${strategyConfig.minChange}, Score: ${strategyConfig.minScore}, Risk: ${strategyConfig.maxRisk}%`;
}
async function evaluateWithStrategy(symbol, strategy) {

  const data = await getStock(symbol);
  const price = data.c;

  const changePercent = Math.abs(data.dp || 0);

  let score = 50;

  if (changePercent > 1) score += 20;
  if (changePercent > 0.5) score += 10;
  if (changePercent < 0.2) score -= 20;

  if (price < 5) score -= 15;

  // apply strategy rules
  if (changePercent > strategy.minChange) {
    score += 15;
  } else {
    score -= 10;
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  let signal = "AVOID";

  if (score >= strategy.minScore) {
    signal = "BUY";
  } else if (score >= 50) {
    signal = "WATCH";
  }

  return {
    symbol,
    price,
    score,
    signal
  };
}

async function runStrategyComparison() {

  const container = document.getElementById("strategyResults");
  container.innerHTML = "Running comparison...";

  let results = [];

  for (let strategy of strategies) {

    let totalScore = 0;
    let buySignals = 0;

    for (let symbol of symbols) {

      const result = await evaluateWithStrategy(symbol, strategy);

      totalScore += result.score;

      if (result.signal === "BUY") {
        buySignals++;
      }
    }

    results.push({
      name: strategy.name,
      avgScore: totalScore / symbols.length,
      buySignals
    });
  }

  // sort best first
  results.sort((a, b) => b.avgScore - a.avgScore);

  // display results
  container.innerHTML = "";

  results.forEach((r, index) => {

    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${index + 1}. ${r.name}</h3>
      <p>Average Score: ${r.avgScore.toFixed(2)}</p>
      <p>BUY Signals: ${r.buySignals}</p>
      <hr>
    `;

    container.appendChild(div);
  });
}
function generateCombinations() {

  const combos = [];

  for (let mc of optimizerGrid.minChange) {
    for (let ms of optimizerGrid.minScore) {
      for (let mr of optimizerGrid.maxRisk) {

        combos.push({
          name: `MC${mc}-MS${ms}-R${mr}`,
          minChange: mc,
          minScore: ms,
          maxRisk: mr
        });

      }
    }
  }

  return combos;
}
function simulateStrategy(strategy) {

  let balance = 10000;
  let trades = [];
  let open = null;

  for (let snapshot of marketHistory) {

    for (let stock of snapshot) {

      const price = stock.price;

      const changePercent = Math.abs(stock.dp || 0);

      let score = 50;

      if (changePercent > strategy.minChange) score += 15;
      if (changePercent < 0.2) score -= 20;

      if (score >= strategy.minScore && !open) {

        open = {
          entry: price,
          shares: 10,
          stop: price * 0.98,
          take: price * 1.03
        };
      }

      if (open) {

        if (price <= open.stop || price >= open.take) {

          const pl = (price - open.entry) * open.shares;

          balance += pl;

          trades.push(pl);

          open = null;
        }
      }
    }
  }

  const wins = trades.filter(t => t > 0).length;
  const winRate = trades.length ? wins / trades.length : 0;
  const totalPL = trades.reduce((a, b) => a + b, 0);

  return {
    strategy,
    balance,
    winRate,
    totalPL,
    trades: trades.length
  };
}
function runOptimizer() {

  if (marketHistory.length === 0) {
    alert("No data recorded. Run recording first.");
    return;
  }

  const container = document.getElementById("optimizerResults");
  container.innerHTML = "Optimizing...";

  const combos = generateCombinations();

  let results = [];

  for (let strategy of combos) {

    const result = simulateStrategy(strategy);

    results.push(result);
  }

  // sort best by profit
  results.sort((a, b) => b.totalPL - a.totalPL);

  const best = results[0];

  // apply best strategy globally
  strategyConfig = best.strategy;

  document.getElementById("optimizerResults").innerHTML = `
    <h3>🏆 Best Strategy Found</h3>
    <p>${best.strategy.name}</p>
    <p>Profit: $${best.totalPL.toFixed(2)}</p>
    <p>Win Rate: ${(best.winRate * 100).toFixed(1)}%</p>
    <p>Trades: ${best.trades}</p>
  `;
}
function updatePortfolioRisk() {

  let totalExposure = 0;
  let positionExposure = {};

  // calculate exposure per stock + total
  positions.forEach(pos => {

    const exposure = pos.entry * pos.shares;

    totalExposure += exposure;

    if (!positionExposure[pos.symbol]) {
      positionExposure[pos.symbol] = 0;
    }

    positionExposure[pos.symbol] += exposure;
  });

  const portfolioRiskPercent = (totalExposure / balance) * 100;

  // UI updates
  document.getElementById("totalExposure").innerText =
    totalExposure.toFixed(2);

  document.getElementById("portfolioRisk").innerText =
    portfolioRiskPercent.toFixed(2) + "%";

  // RULE 1: total exposure limit
  if (portfolioRiskPercent > portfolioConfig.maxExposurePercent) {
    document.getElementById("portfolioStatus").innerText =
      "🚫 TOO MUCH RISK - REDUCE POSITIONS";

    tradingLocked = true;
  } else {
    document.getElementById("portfolioStatus").innerText =
      "🟢 Portfolio Healthy";

    tradingLocked = false;
  }

  // RULE 2: single stock concentration risk
  for (let symbol in positionExposure) {

    const percent = (positionExposure[symbol] / balance) * 100;

    if (percent > portfolioConfig.maxSinglePositionPercent) {
      console.warn(`Overexposed in ${symbol}`);
    }
  }
}



setInterval(async () => {

  // MARKET DATA UPDATES
  await renderWatchlist();

  // TRADING SYSTEM LOGIC
  await checkStopLosses();

  // UI UPDATES (run once)
  checkTakeProfits();
  renderPositions();
  renderJournal();
  analyzeMistakes();
  updateEquityCurve();
  updateStats();
  calculateTradingScore();
  updateDrawdownProtection(); 
  updatePortfolioRisk();

 // REPLAY SYSTEM

  recordMarket();

  runReplayStep();

}, 5000);

// INIT (IMPORTANT)
window.onload = function () {
  renderWatchlist();
  renderPositions();
  renderJournal();
  analyzeMistakes();
  initEquityChart();
};

