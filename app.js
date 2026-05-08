const API_KEY = "YOUR_API_KEY";

async function getPrice() {
  const symbol = document.getElementById("symbol").value;

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
  );

  const data = await res.json();

  document.getElementById("price").innerText = data.c;
}