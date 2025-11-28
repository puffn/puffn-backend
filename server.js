import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import fs from "fs";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// CORS (allow Netlify domain)
app.use(cors({
  origin: "https://steamubilink.netlify.app",
  methods: ["POST", "GET"],
  credentials: true
}));

// JSON + URL parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Raw body for webhook
app.use(
  "/webhook",
  bodyParser.raw({ type: "application/json" })
);

/* ----------------------- ORDER COUNTER ----------------------- */
function getNextOrderNumber() {
  let count = 0;

  if (fs.existsSync("orders.json")) {
    const data = JSON.parse(fs.readFileSync("orders.json", "utf8"));
    count = data.count;
  }

  count += 1;
  fs.writeFileSync("orders.json", JSON.stringify({ count }, null, 2));
  return String(count).padStart(4, "0");
}

/* ----------------------- KEY SYSTEM --------------------------- */
function getNextKey() {
  const file = "keys.txt";
  if (!fs.existsSync(file)) return null;

  const keys = fs.readFileSync(file, "utf8")
    .trim()
    .split("\n");

  if (keys.length === 0) return null;

  const key = keys[0];
  fs.writeFileSync(file, keys.slice(1).join("\n"));
  return key;
}

/* ----------------------- EMAIL SYSTEM ------------------------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateEmailHTML(orderNumber, email, key, amount) {
  return `
  <html>
  <body style="font-family:Arial;background:#0b0b12;color:#fff;padding:30px">
    <div style="max-width:600px;margin:auto;background:#11111a;padding:25px;border-radius:12px">
      <h2 style="color:#e66bff;">🎉 Your Puffn Steam → Ubi Key Is Ready!</h2>

      <p><b>Order:</b> #${orderNumber}</p>
      <p><b>Email:</b> ${email}</p>

      <div style="margin-top:20px;padding:15px;background:#1a1a26;border:1px solid #e66bff;color:#e66bff;font-size:20px;text-align:center;">
        ${key}
      </div>

      <p><b>Total Paid:</b> $${amount}</p>
      <p>Delivered instantly by Puffn.</p>
    </div>
  </body>
  </html>`;
}

/* ----------------------- CHECKOUT ----------------------------- */
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: req.body.email,
      success_url: "https://steamubilink.netlify.app/success",
      cancel_url: "https://steamubilink.netlify.app/cancel",
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});

/* ----------------------- WEBHOOK ------------------------------ */
app.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send("Webhook error");
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;

    const email = s.customer_details.email;
    const amount = (s.amount_total / 100).toFixed(2);

    const key = getNextKey();
    const orderNum = getNextOrderNumber();

    const html = generateEmailHTML(orderNum, email, key, amount);

    transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `Your Puffn Key (Order #${orderNum})`,
      html,
    });

    console.log("📧 Email sent! Delivered key:", key);
  }

  return res.json({ received: true });
});

/* ----------------------- START SERVER -------------------------- */
app.listen(process.env.PORT || 10000, () =>
  console.log("🚀 Render backend online")
);
