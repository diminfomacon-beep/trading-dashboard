const API_KEY = "d7ul6g9r01qnv95o1750d7ul6g9r01qnv95o175g";

async function getPrice() {
  const symbol = document.getElementById("symbol").value;

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
  );

  const data = await res.json();

  document.getElementById("price").innerText = data.c;
}