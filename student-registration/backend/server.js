require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

// --- Dev mode flag ----------------------------------------------------------
// When USE_DEV_MODE=true (or when no Firebase + no MongoDB are configured),
// the app uses an in-memory store and skips real Firebase token verification
// so you can preview the full app without external dependencies.
const DEV_MODE = process.env.USE_DEV_MODE === "true" ||
  (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.MONGO_URI);

if (DEV_MODE) {
  console.log("🛠️  Running in DEV MODE — in-memory store, mock auth");
  console.log("   To use real MongoDB + Firebase, set MONGO_URI and FIREBASE_SERVICE_ACCOUNT in .env");
}

// --- Firebase Admin init (production only) -----------------------------------
if (!DEV_MODE) {
  const admin = require("firebase-admin");
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    try {
      serviceAccount = require("./serviceAccountKey.json");
    } catch {
      console.warn(
        "⚠️  No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json.\n" +
        "   Token verification will fail until this is configured."
      );
    }
  }
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

// --- Express app -------------------------------------------------------------
const app = express();

// Expose DEV_MODE so middleware and routes can read it
app.set("devMode", DEV_MODE);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/health", (_req, res) => res.json({ status: "ok", devMode: DEV_MODE }));

// --- Routes ------------------------------------------------------------------
if (DEV_MODE) {
  // In dev mode, use a simple in-memory store instead of MongoDB
  const devStudents = [];
  const verifyFirebaseToken = require("./middleware/verifyFirebaseToken");

  app.post("/api/students", verifyFirebaseToken, (req, res) => {
    const { studentName, collegeName, regNo, collegeId } = req.body;

    if (!studentName || !collegeName || !regNo || !collegeId) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existing = devStudents.find((s) => s.regNo === regNo.trim());
    if (existing) {
      return res.status(409).json({ message: "This registration number has already been submitted." });
    }

    const student = {
      id: `dev-${Date.now()}`,
      googleId: req.user.uid,
      email: req.user.email,
      studentName: studentName.trim(),
      collegeName: collegeName.trim(),
      regNo: regNo.trim(),
      collegeId: collegeId.trim(),
      createdAt: new Date(),
    };
    devStudents.push(student);

    console.log(`📝 Student registered: ${student.studentName} (${student.regNo})`);
    return res.status(201).json({ message: "submission was successful", student });
  });

  app.get("/api/students/me", verifyFirebaseToken, (req, res) => {
    const student = devStudents.find((s) => s.googleId === req.user.uid) || null;
    return res.json({ student });
  });
} else {
  // Production: use the real Mongoose-based routes
  const studentsRouter = require("./routes/students");
  app.use("/api/students", studentsRouter);
}

// SPA fallback — serve index.html for any non-API route
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Not found" });
  }
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// --- Start -------------------------------------------------------------------
const PORT = process.env.PORT || 4000;

async function start() {
  if (!DEV_MODE) {
    // Production: connect to real MongoDB
    const mongoose = require("mongoose");
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/student_registration";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Startup error:", err.message);
  process.exit(1);
});
