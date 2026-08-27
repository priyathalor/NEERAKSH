import { logoutUser, listenAuthChanges, sendOTP, verifyOTP } from "./auth.js";
import { loadDashboard } from "./dashboard.js";
import { handleStepClick, syncStepsFromDB, completeStep } from "./steps.js";
import { auth, db } from "./firebase.js";
import { userState } from "./state.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { hideModal } from "./ui.js";
import { doc, setDoc, updateDoc, increment, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { computeSubmissionScore } from "./scoring.js";
import { generateCertificate } from "./certificate.js";
import { uploadImageToCloudinary } from "./cloudinary.js";

// Try the optional local ML REST service first (great for local dev / demos),
// and fall back to the built-in client-side scorer if it isn't reachable —
// this keeps scoring working everywhere, including the deployed static site.
async function scoreSubmission(description) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const mlResponse = await fetch("http://127.0.0.1:6000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (mlResponse.ok) {
      const mlData = await mlResponse.json();
      if (typeof mlData.score === "number") return mlData.score;
    }
  } catch (err) {
    console.info("ML REST service unavailable, using local scorer instead.", err.message);
  }
  return computeSubmissionScore(description);
}

window.addEventListener("DOMContentLoaded", () => {

  // ---------- Step clicks ----------
  document.querySelectorAll(".flow-step").forEach(step => {
    step.addEventListener("click", () => {
      const stepNumber = Number(step.dataset.step);
      handleStepClick(stepNumber);
    });
  });

  // ---------- OTP login ----------
  document.getElementById("send-otp-btn").addEventListener("click", () => {
    const phone = document.getElementById("phoneNumber").value.trim();
    const name = document.getElementById("fullName")?.value.trim() || "";
    sendOTP(phone, name);
  });

  document.getElementById("verify-otp-btn").addEventListener("click", () => {
    const otp = document.getElementById("otp").value.trim();
    verifyOTP(otp);
  });

  // ---------- Auth state ----------
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadDashboard();
      syncStepsFromDB();
      document.querySelectorAll(".logout-btn, #logoutBtn").forEach(btn => btn.style.display = "inline-flex");
    } else {
      document.querySelectorAll(".logout-btn, #logoutBtn").forEach(btn => btn.style.display = "none");
    }
  });

  // ---------- Logout ----------
  document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", logoutUser);
  });

  listenAuthChanges();

  // ---------- Upload picture (Step 2) ----------
  document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("picture");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select an image");
      return;
    }

    const uploadBtn = document.querySelector("#uploadForm button[type='submit']");
    uploadBtn.disabled = true;
    uploadBtn.innerText = "Uploading to Cloud...";

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const imageUrl = await uploadImageToCloudinary(file);

      // Persist across reloads so users can complete the flow over multiple visits
      localStorage.setItem("uploadedImageUrl", imageUrl);

      alert("Upload successful ✅\nImage securely saved to Cloud!");

      await completeStep(2);
      hideModal("uploadModal");
      fileInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Upload Failed: " + err.message);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerText = "Upload";
    }
  });

  // ---------- Picture details (Step 3) ----------
  document.getElementById("detailsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!title || !description) {
      alert("Please fill all fields");
      return;
    }

    localStorage.setItem("title", title);
    localStorage.setItem("description", description);

    alert("Details saved ✅");

    await completeStep(3);
    hideModal("detailsModal");
  });

  // ---------- Final submission (Step 4) ----------
  document.getElementById("finalizeBtn").addEventListener("click", async () => {
    const finalizeBtn = document.getElementById("finalizeBtn");
    finalizeBtn.disabled = true;
    finalizeBtn.innerText = "Submitting...";

    const title = localStorage.getItem("title");
    const description = localStorage.getItem("description");
    const imageUrl = localStorage.getItem("uploadedImageUrl");

    if (!imageUrl) {
      alert("Missing Picture! Please complete Step 2 to securely upload your image. ❌");
      finalizeBtn.disabled = false;
      finalizeBtn.innerText = "Confirm & Submit";
      return;
    }

    if (!title || !description) {
      alert("Missing Details (Title/Description). Please complete Step 3. ❌");
      finalizeBtn.disabled = false;
      finalizeBtn.innerText = "Confirm & Submit";
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const mlScore = await scoreSubmission(description);

      const submissionRef = doc(db, "submissions", user.uid + "_" + Date.now());
      await setDoc(submissionRef, {
        uid: user.uid,
        title,
        description,
        imageUrl,
        mlScore,
        timestamp: new Date().toISOString()
      });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        points: increment(mlScore)
      });

      alert(`Submission successful 🎉\nYour Impact Score is: ${mlScore}`);

      await completeStep(4);

      hideModal("confirmModal");
      localStorage.removeItem("title");
      localStorage.removeItem("description");
      localStorage.removeItem("uploadedImageUrl");

    } catch (err) {
      console.error(err);
      alert(`Submission Error: ${err.message}`);
    } finally {
      finalizeBtn.disabled = false;
      finalizeBtn.innerText = "Confirm & Submit";
    }
  });

  // ---------- Certificate download ----------
  document.getElementById("downloadCertBtn")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("⚠️ Please login first.");
      return;
    }

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const data = userSnap.exists() ? userSnap.data() : {};
      const points = data.points || 0;

      if (points < 150) {
        alert(`🔒 You need 150 points to unlock your certificate (currently ${points}).`);
        return;
      }

      generateCertificate({
        name: data.name || userState.name || user.phoneNumber || "NEERAKSH Participant",
        points,
        date: new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
      });
    } catch (err) {
      console.error(err);
      alert("Could not generate certificate: " + err.message);
    }
  });

  // ---------- Mobile menu ----------
  document.getElementById("menu-btn")?.addEventListener("click", () => {
    document.getElementById("mobile-menu")?.classList.toggle("hidden");
  });
  document.querySelectorAll("#mobile-menu a[href^='#']").forEach(link => {
    link.addEventListener("click", () => document.getElementById("mobile-menu")?.classList.add("hidden"));
  });

  // ---------- Hero carousel ----------
  initCarousel();
});

function initCarousel() {
  const track = document.querySelector(".carousel-track");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");
  if (!track || !prevBtn || !nextBtn) return;

  const slideCount = track.children.length; // includes 1 clone at each end
  let index = 1; // start on the first "real" slide
  let isTransitioning = false;

  function goTo(newIndex, animate = true) {
    track.style.transition = animate ? "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)" : "none";
    track.style.transform = `translateX(-${newIndex * 100}%)`;
    index = newIndex;
  }

  goTo(index, false);

  track.addEventListener("transitionend", () => {
    isTransitioning = false;
    if (index === 0) {
      goTo(slideCount - 2, false);
    } else if (index === slideCount - 1) {
      goTo(1, false);
    }
  });

  function next() {
    if (isTransitioning) return;
    isTransitioning = true;
    goTo(index + 1);
  }

  function prev() {
    if (isTransitioning) return;
    isTransitioning = true;
    goTo(index - 1);
  }

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  // Auto-advance every 5s, pausing on hover
  let autoplay = setInterval(next, 5000);
  const carousel = document.querySelector(".carousel");
  carousel?.addEventListener("mouseenter", () => clearInterval(autoplay));
  carousel?.addEventListener("mouseleave", () => autoplay = setInterval(next, 5000));
}
