const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const admin = require("firebase-admin");

const app = express();

// Initialize Firebase Admin for token verification (projectId only)
try {
  admin.initializeApp({ projectId: "neeraksh-1736" });
  console.log("🔥 Firebase Admin initialized");
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

// Connect to MongoDB (optional — the app's core flow uses Firestore directly
// from the frontend, so this backend is only needed for future privileged
// server-side features). The server still starts if Mongo isn't running.
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/neeraksh";
mongoose.connect(MONGO_URI)
  .then(() => console.log("📦 Connected to MongoDB"))
  .catch(err => console.error("⚠️  MongoDB connection error (backend will still run):", err.message));

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api", require("./routes/submission.routes"));

// Test route
app.get("/", (req, res) => {
  res.send("✅ Neeraksh Backend is running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
