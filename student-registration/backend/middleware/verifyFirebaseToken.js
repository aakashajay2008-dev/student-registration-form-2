const admin = require("firebase-admin");

/**
 * Verifies the Firebase ID token sent by the frontend in the
 * `Authorization: Bearer <token>` header. On success, attaches the
 * decoded user (uid, email, name, picture) to req.user.
 *
 * We NEVER trust a googleId/email sent in the request body — they're
 * always taken from the verified token instead, so a client can't spoof
 * another user's identity.
 *
 * In DEV_MODE, the middleware accepts a mock token ("dev-token") and
 * creates a fake user object so the form can be tested without Firebase.
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header." });
  }

  // --- Dev mode: accept mock tokens ---
  const devMode = req.app.get("devMode");
  if (devMode) {
    // In dev mode, parse the token as a JSON payload OR accept any token
    // The frontend sends a JSON-encoded mock user object as the token
    try {
      const mockUser = JSON.parse(token);
      req.user = {
        uid: mockUser.uid || "dev-user-001",
        email: mockUser.email || "dev@example.com",
        name: mockUser.name || "Dev User",
        picture: mockUser.picture || "",
      };
    } catch {
      // If token is not JSON, use default dev user
      req.user = {
        uid: "dev-user-001",
        email: "dev@example.com",
        name: "Dev User",
        picture: "",
      };
    }
    return next();
  }

  // --- Production: real Firebase verification ---
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token. Please sign in again." });
  }
}

module.exports = verifyFirebaseToken;
