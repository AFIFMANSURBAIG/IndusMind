import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

/* ===== STORE LATEST DATA ===== */
const motors = {
  MOTOR_1: {},
  MOTOR_2: {}
};

/* ===== ESP32 DATA API ===== */
app.post("/api/data", (req, res) => {
  const { device } = req.body;
  if (!device) return res.sendStatus(400);

  motors[device] = req.body;
  console.log("Data:", req.body);

  res.sendStatus(200);
});

/* ===== GET MOTOR DATA ===== */
app.get("/api/motor/:id", (req, res) => {
  res.json(motors[req.params.id] || {});
});

/* ===== AI CHAT API ===== */
app.post("/api/chat", async (req, res) => {
  const { question, motor } = req.body;
  const data = motors[motor] || {};

  const prompt = `
Motor: ${motor}
Vibration: ${data.vibration}
Sound: ${data.sound}
Voltage: ${data.voltage}
Temperature: ${data.temp}
Humidity: ${data.humidity}

User question: ${question}
Give short industrial-level answer.
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://indusmind-3nfv.onrender.com",
          "X-Title": "IndusMind"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }]
        })
      }
    );

    const result = await response.json();
    res.json({ answer: result.choices[0].message.content });

  } catch (err) {
    res.status(500).json({ error: "AI failed" });
  }
});

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
