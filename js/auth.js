import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { hideModal } from "./ui.js";
import { completeStep } from "./steps.js";
import { setUser, clearUser } from "./state.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let confirmationResult;
let pendingName = "";

// Basic E.164-ish check: + followed by 10-15 digits
function isValidPhone(phone) {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

// Lazily create (or reuse) the invisible reCAPTCHA verifier.
// Recreating it on every click throws "reCAPTCHA has already been rendered".
function getRecaptchaVerifier() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(
      "recaptcha-container",
      { size: "invisible" },
      auth
    );
  }
  return window.recaptchaVerifier;
}

// Send OTP
export async function sendOTP(phone, name) {
  const sendBtn = document.getElementById("send-otp-btn");

  if (!isValidPhone(phone)) {
    alert("⚠️ Please enter a valid phone number in international format, e.g. +91XXXXXXXXXX");
    return;
  }
  if (!name || !name.trim()) {
    alert("⚠️ Please enter your full name.");
    return;
  }
  pendingName = name.trim();

  try {
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerText = "Sending OTP...";
    }

    const verifier = getRecaptchaVerifier();
    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);

    document.getElementById("otpForm").style.display = "block";
    document.getElementById("otp").focus();
  } catch (err) {
    console.error(err);

    // If reCAPTCHA got into a bad state, reset it so the next attempt works
    if (window.recaptchaVerifier) {
      try {
        const widgetId = await window.recaptchaVerifier.render();
        if (window.grecaptcha) window.grecaptcha.reset(widgetId);
      } catch (_) { /* ignore */ }
    }

    alert(friendlyAuthError(err));
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerText = "Send OTP";
    }
  }
}

// Verify OTP
export async function verifyOTP(code) {
  const verifyBtn = document.getElementById("verify-otp-btn");

  if (!code || code.trim().length < 6) {
    alert("⚠️ Please enter the 6-digit OTP.");
    return;
  }

  try {
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerText = "Verifying...";
    }

    if (!confirmationResult) {
      throw new Error("Please request a new OTP first.");
    }

    const result = await confirmationResult.confirm(code.trim());

    if (pendingName) {
      try {
        await updateProfile(result.user, { displayName: pendingName });
      } catch (e) {
        console.warn("Could not set displayName:", e);
      }
    }

    setUser(result.user, pendingName);

    // Check for existing user before setting defaults (avoid resetting points)
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: pendingName || "",
        phone: result.user.phoneNumber || "",
        points: 0,
        completedSteps: []
      });
      // Complete step 1 (only for fresh users)
      await completeStep(1);
    } else if (pendingName) {
      // Keep the stored name in sync if the user re-logs-in with a new name
      await setDoc(userRef, { name: pendingName }, { merge: true });
    }

    hideModal("loginModal");
    alert("Login successful ✅ Welcome to NEERAKSH!");
  } catch (err) {
    console.error(err);
    alert(friendlyAuthError(err));
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerText = "Verify OTP";
    }
  }
}

// Logout
export async function logoutUser() {
  await signOut(auth);
  clearUser();
  location.reload();
}

// Sync auth
export function listenAuthChanges() {
  onAuthStateChanged(auth, (user) => {
    if (user) setUser(user, user.displayName);
    else clearUser();
  });
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "❌ That phone number looks invalid. Use international format, e.g. +91XXXXXXXXXX.";
    case "auth/too-many-requests":
      return "❌ Too many attempts. Please wait a while and try again.";
    case "auth/invalid-verification-code":
      return "❌ Invalid OTP. Please check the code and try again.";
    case "auth/code-expired":
      return "❌ This OTP expired. Please request a new one.";
    case "auth/quota-exceeded":
      return "❌ SMS quota exceeded for this project right now. Please try again later.";
    default:
      return "❌ " + (err?.message || "Something went wrong. Please try again.");
  }
}
