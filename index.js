const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const dataStore = {
  MOTOR_1: {},
  MOTOR_2: {}
};

// ESP32 sends data here
app.post("/api/data", (req, res) => {
  const { device } = req.body;
  if (!device) return res.status(400).send("No device");

  // store raw data and add server timestamp if missing
  const payload = Object.assign({}, req.body);
  if (!payload.timestamp) payload.timestamp = Date.now();
  dataStore[device] = payload;
  console.log("DATA:", payload);

  // compute lightweight state for UI
  try {
    const t = Number(payload.temp);
    const h = Number(payload.humidity);
    const v = Number(payload.voltage);
    let state = 'unknown';
    if (!isNaN(t) && (t > 60 || h > 90)) state = 'warning';
    else if (!isNaN(v) && v < 2.5) state = 'warning';
    else state = 'ok';
    dataStore[device].state = state;
  } catch (e) {
    dataStore[device].state = 'unknown';
  }

  // asynchronously send to AI (if configured) and store summary
  (async () => {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
      const aiEnabled = process.env.AI_ENABLED === undefined ? true : (process.env.AI_ENABLED === 'true');
      if (!apiKey || !aiEnabled) return;
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      const sensorSummary = `Device ${payload.device} readings: vibration=${payload.vibration}, sound=${payload.sound}, voltage=${payload.voltage}, temp=${payload.temp}, humidity=${payload.humidity}.`;
      const body = {
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: 'You are an assistant that summarizes sensor data and suggests short actions.' },
          { role: 'user', content: sensorSummary + ' Provide a one-sentence summary and a short status (ok/warning).' }
        ],
        max_tokens: 200
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      if (!r.ok) return;
      const j = await r.json();
      const reply = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || null;
      if (reply) dataStore[device].aiSummary = reply;
    } catch (e) {
      console.error('AI send error', e);
    }
  })();

  res.send("OK");
});

// Motor APIs
app.get("/api/motor/:id", (req, res) => {
  res.json(dataStore[req.params.id] || {});
});

// Pages
app.get("/motor1", (req, res) =>
  res.sendFile(__dirname + "/public/motor1.html")
);
app.get("/motor2", (req, res) =>
  res.sendFile(__dirname + "/public/motor2.html")
);

// Chat endpoint: accept { device, message } and forward to OpenRouter, including last snapshot
app.post('/api/chat', async (req, res) => {
  const { device, message } = req.body || {};
  if (!device || !message) return res.status(400).json({ error: 'device and message required' });
  const snapshot = dataStore[device] || {};
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const aiEnabled = process.env.AI_ENABLED === undefined ? true : (process.env.AI_ENABLED === 'true');
  if (!apiKey || !aiEnabled) return res.status(500).json({ error: 'AI not available (missing API key or AI_ENABLED=false)' });

  try {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const system = `You are an assistant for motor monitoring. Use the following latest sensor snapshot to inform your answers: ${JSON.stringify(snapshot)}.`;
    const body = {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message }
      ],
      max_tokens: 400
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).json({ error: 'AI error', details: txt });
    }

    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || 'No reply';
    return res.json({ reply });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
