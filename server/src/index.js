const express = require("express");
const cors = require("cors");
const geocodeRoutes = require("./routes/geocode");

const app = express();
app.use(cors({ origin: "http://localhost:4000" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("NightPulse Backend Running");
});

app.use("/api", geocodeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
