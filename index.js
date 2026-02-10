const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let motors = {
  MOTOR_1: {},
  MOTOR_2: {}
};

// ESP32 sends data here
app.post("/api/data", (req, res) => {
  const { device } = req.body;
  if (device && motors[device]) {
    motors[device] = req.body;
    console.log("Data received:", req.body);
  }
  res.json({ status: "ok" });
});

// Browser reads data here
app.get("/api/motor/:id", (req, res) => {
  res.json(motors[req.params.id] || {});
});

// Pages
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/motor1", (req, res) => {
  res.sendFile(__dirname + "/public/motor1.html");
});

app.get("/motor2", (req, res) => {
  res.sendFile(__dirname + "/public/motor2.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("IndusMind server running on port", PORT)
);
