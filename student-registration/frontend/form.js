import { firebaseConfig, API_BASE_URL, IS_DEV_MODE } from "./firebase-config.js";

const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toastClose = document.getElementById("toast-close");
const form = document.getElementById("student-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

let currentUser = null;
let getIdToken = null;

function showToast(msg, type = "success") {
  toastMsg.textContent = msg;
  toast.className = "show " + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.className = ""; }, 4000);
}
toastClose.addEventListener("click", () => { toast.className = ""; });

if (IS_DEV_MODE) {
  const devUserStr = sessionStorage.getItem("devUser");
  if (!devUserStr) {
    window.location.href = "index.html";
  } else {
    const devUser = JSON.parse(devUserStr);
    currentUser = devUser;
    document.getElementById("user-name").textContent = devUser.displayName || devUser.email;
    getIdToken = async () => JSON.stringify({ uid: devUser.uid, email: devUser.email, name: devUser.displayName });
    document.getElementById("signout-btn").addEventListener("click", () => {
      sessionStorage.removeItem("devUser");
      window.location.href = "index.html";
    });
  }
} else {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getAuth, onAuthStateChanged, signOut } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  const auth = getAuth(initializeApp(firebaseConfig));

  onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    currentUser = user;
    getIdToken = () => user.getIdToken();
    document.getElementById("user-name").textContent = user.displayName || user.email || "";
    if (user.photoURL) {
      const av = document.getElementById("user-avatar");
      av.src = user.photoURL;
      av.style.display = "inline-block";
    }
  });

  document.getElementById("signout-btn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.className = "";
  if (!currentUser) { window.location.href = "index.html"; return; }

  const payload = {
    studentName: document.getElementById("studentName").value.trim(),
    collegeName: document.getElementById("collegeName").value.trim(),
    regNo: document.getElementById("regNo").value.trim(),
    collegeId: document.getElementById("collegeId").value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting\u2026";

  try {
    const idToken = await getIdToken();
    const res = await fetch(${API_BASE_URL}/api/students, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: Bearer  },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Submission failed. Please try again.");
    showToast("Submission was successful!", "success");
    form.reset();
  } catch (err) {
    console.error(err);
    formError.textContent = err.message;
    formError.className = "show";
    showToast(err.message || "Something went wrong.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});