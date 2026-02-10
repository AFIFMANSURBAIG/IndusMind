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

  dataStore[device] = req.body;
  console.log("DATA:", req.body);
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

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
