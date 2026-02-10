const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Store latest data from motors
const motors = {
  MOTOR_1: {},
  MOTOR_2: {}
};

// Home page (fixes Cannot GET /)
app.get("/", (req, res) => {
  res.send(`
    <h1>IndusMind</h1>
    <p>ESP32 Motor Monitoring System</p>
    <p>Available Motors:</p>
    <ul>
      <li><a href="/motor1">Motor 1</a></li>
      <li><a href="/motor2">Motor 2</a></li>
    </ul>
  `);
});

// Motor 1 page
app.get("/motor1", (req, res) => {
  res.send(`
    <h2>Motor 1</h2>
    <div id="data">Loading...</div>
    <script>
      setInterval(async () => {
        const res = await fetch('/api/data/MOTOR_1');
        const d = await res.json();
        document.getElementById('data').innerHTML =
          'Vibration: ' + d.vibration + '<br>' +
          'Sound: ' + d.sound + '<br>' +
          'Voltage: ' + d.voltage + '<br>' +
          'Temp: ' + d.temp + '<br>' +
          'Humidity: ' + d.humidity;
      }, 500);
    </script>
  `);
});

// Motor 2 page
app.get("/motor2", (req, res) => {
  res.send(`
    <h2>Motor 2</h2>
    <div id="data">Loading...</div>
    <script>
      setInterval(async () => {
        const res = await fetch('/api/data/MOTOR_2');
        const d = await res.json();
        document.getElementById('data').innerHTML =
          'Vibration: ' + d.vibration + '<br>' +
          'Sound: ' + d.sound + '<br>' +
          'Voltage: ' + d.voltage + '<br>' +
          'Temp: ' + d.temp + '<br>' +
          'Humidity: ' + d.humidity;
      }, 500);
    </script>
  `);
});

// ESP32 sends data here
app.post("/api/data", (req, res) => {
  const data = req.body;
  if (!data.device) {
    return res.status(400).json({ error: "No device ID" });
  }
  motors[data.device] = data;
  res.json({ status: "ok" });
});

// Website reads data here
app.get("/api/data/:device", (req, res) => {
  res.json(motors[req.params.device] || {});
});

app.listen(PORT, () => {
  console.log("IndusMind running on port", PORT);
});
