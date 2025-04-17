const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/geocode", async (req, res) => {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
        },
        headers: { "User-Agent": "NightPulse/1.0 (rakshitatwork@gmail.com)" },
      }
    );
    if (!response.data || response.data.length === 0) {
      return res
        .status(404)
        .json({ error: "No location found for the address" });
    }
    const { lat, lon } = response.data[0];
    res.json({ lat: parseFloat(lat), lng: parseFloat(lon) });
  } catch (error) {
    console.error("Geocoding error:", error.message);
    res.status(500).json({ error: "Geocoding failed", details: error.message });
  }
});

module.exports = router;
