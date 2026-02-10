const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let latestData = {
  MOTOR_1: {},
  MOTOR_2: {}
};

/* ===== ESP32 SENDS DATA HERE ===== */
app.post("/api/data", (req, res) => {
  const { device } = req.body;
  if (!device) return res.status(400).send("No device ID");

  latestData[device] = req.body;
  console.log("Received from", device, req.body);
  res.send("OK");
});

/* ===== WEBSITE READS DATA HERE ===== */
app.get("/api/data/:motor", (req, res) => {
  const motor = req.params.motor;
  res.json(latestData[motor] || {});
});

/* ===== ROOT PAGE ===== */
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("IndusMind server running on port", PORT);
});
