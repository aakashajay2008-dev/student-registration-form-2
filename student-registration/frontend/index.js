import { firebaseConfig, IS_DEV_MODE } from "./firebase-config.js";

document.getElementById("year").textContent = new Date().getFullYear();

const btn = document.getElementById("google-signin-btn");
const btnLabel = document.getElementById("btn-label");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toastClose = document.getElementById("toast-close");

function showToast(msg, type = "error") {
  toastMsg.textContent = msg;
  toast.className = "show " + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.className = ""; }, 4000);
}
toastClose?.addEventListener("click", () => { toast.className = ""; });

if (IS_DEV_MODE) {
  document.getElementById("dev-banner").style.display = "block";
  if (sessionStorage.getItem("devUser")) window.location.href = "form.html";

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btnLabel.textContent = "Signing in\u2026";
    sessionStorage.setItem("devUser", JSON.stringify({
      uid: "dev-user-001", email: "dev@example.com",
      displayName: "Dev User", photoURL: ""
    }));
    setTimeout(() => { window.location.href = "form.html"; }, 500);
  });
} else {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  const auth = getAuth(initializeApp(firebaseConfig));
  const provider = new GoogleAuthProvider();

  onAuthStateChanged(auth, (user) => { if (user) window.location.href = "form.html"; });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btnLabel.textContent = "Signing in\u2026";
    try {
      await signInWithPopup(auth, provider);
      window.location.href = "form.html";
    } catch {
      showToast("Sign-in failed. Please try again.");
      btn.disabled = false;
      btnLabel.textContent = "Sign in with Google";
    }
  });
}