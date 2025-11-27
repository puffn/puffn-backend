document.addEventListener("DOMContentLoaded", () => {
  const buyBtn = document.getElementById("buyBtn");

  buyBtn.addEventListener("click", async () => {
    const emailInput = document.getElementById("emailInput");
    const email = emailInput.value.trim();

    if (!email) {
      alert("Please enter your email.");
      return;
    }

    buyBtn.disabled = true;
    buyBtn.innerText = "Processing...";

    try {
      const res = await fetch("https://puffn-backend-11jo.onrender.com/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;  // Redirect to Stripe checkout
      } else {
        alert("Something went wrong. Try again.");
      }

    } catch (err) {
      console.error("Checkout Error:", err);
      alert("Unable to reach payment server.");
    }

    buyBtn.disabled = false;
    buyBtn.innerText = "Buy Key";
  });
});
