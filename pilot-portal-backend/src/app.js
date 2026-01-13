require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect DB
connectDB();

// Health check endpoint for Docker
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Pilot Portal Backend is running",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/medicals", require("./routes/medicals.routes"));
app.use("/api/logbook", require("./routes/logbook.routes"));
app.use("/api/license", require("./routes/license.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/uploads", express.static("uploads"));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
