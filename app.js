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
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
  );

  return await res.json();
}

// Render watchlist
async function renderWatchlist() {
  const table = document.getElementById("watchlist");
  table.innerHTML = "";

  for (let symbol of symbols) {
    const data = await getStock(symbol);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${symbol}</td>
      <td>$${data.c}</td>
      <td>${data.d} (${data.dp}%)</td>
      <td><button onclick="removeSymbol('${symbol}')">Remove</button></td>
    `;

    table.appendChild(row);
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