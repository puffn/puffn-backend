document.getElementById("buyKeyBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;

    if (!email) {
        alert("Please enter your email!");
        return;
    }

    try {
        const response = await fetch("https://puffn-backend-11jo.onrender.com/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Something went wrong.");
        }

    } catch (err) {
        alert("Unable to connect to payment server.");
        console.error(err);
    }
});
