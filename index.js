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
  console.log("Chat request received:", req.body);
  
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
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log("API Key present:", !!apiKey);
    
    if (!apiKey) {
      console.log("Missing API key");
      return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
    }

    console.log("Calling OpenRouter...");
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter error:", response.status, text);
      return res.status(500).json({ 
        error: "OpenRouter API error",
        status: response.status,
        details: text.substring(0, 200)
      });
    }

    const result = await response.json();
    console.log("OpenRouter result:", result);
    
    const answer = result?.choices?.[0]?.message?.content;
    if (!answer) {
      console.log("No answer in response");
      return res.status(500).json({ error: "No answer from AI" });
    }
    
    res.json({ answer });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "AI failed", message: err.message });
  }
});

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
