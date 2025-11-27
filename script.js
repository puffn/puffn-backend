document.getElementById("buyButton").addEventListener("click", async () => {
  const email = document.getElementById("email").value;

  if (!email) {
    alert("Please enter your email.");
    return;
  }

  const res = await fetch("/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  const data = await res.json();

  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("Error creating payment session.");
  }
});
