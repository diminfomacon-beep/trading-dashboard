const API_KEY = "d7ul6g9r01qnv95o1750d7ul6g9r01qnv95o175g";


let symbols = ["AAPL", "TSLA", "MSFT"];

function addSymbol() {
  const input = document.getElementById("symbolInput");
  const symbol = input.value.toUpperCase();

  if (!symbols.includes(symbol)) {
    symbols.push(symbol);
    renderWatchlist();
  }

  input.value = "";
}

// Fetch stock data
async function getStock(symbol) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
    );

    const data = await res.json();

    return {
      c: data.c ?? 0,
      d: data.d ?? 0,
      dp: data.dp ?? 0
    };

  } catch (error) {
    return {
      c: 0,
      d: 0,
      dp: 0
    };
  }
}

// Render watchlist
async function renderWatchlist() {
  const table = document.getElementById("watchlist");
  table.innerHTML = "";

  const requests = symbols.map(symbol => getStock(symbol));
  const results = await Promise.all(requests);

  results.forEach((data, index) => {
    const symbol = symbols[index];

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
}

// Remove stock
function removeSymbol(symbol) {
  symbols = symbols.filter(s => s !== symbol);
  renderWatchlist();
}

// Auto-refresh every 10 seconds
setInterval(renderWatchlist, 10000);

// Initial load
renderWatchlist();