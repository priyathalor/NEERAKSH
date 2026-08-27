import { db, auth } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Badge tiers unlocked as the user earns points
export const BADGE_TIERS = [
  { min: 0, name: "Water Drop", icon: "💧" },
  { min: 50, name: "Bronze Guardian", icon: "🥉" },
  { min: 100, name: "Silver Guardian", icon: "🥈" },
  { min: 150, name: "Gold Guardian", icon: "🥇" }
];

export function getEarnedBadges(points) {
  return BADGE_TIERS.filter(tier => points >= tier.min);
}

function renderBadges(points) {
  const container = document.getElementById("badgesContainer");
  if (!container) return;

  const earned = getEarnedBadges(points);
  const nextTier = BADGE_TIERS.find(tier => tier.min > points);

  container.innerHTML = earned.map(tier => `
    <div class="badge earned" title="${tier.name}">
      <span class="badge-icon">${tier.icon}</span>
      <span class="badge-name">${tier.name}</span>
    </div>
  `).join("") + (nextTier ? `
    <div class="badge locked" title="Locked">
      <span class="badge-icon">🔒</span>
      <span class="badge-name">${nextTier.name} at ${nextTier.min} pts</span>
    </div>
  ` : "");
}

export function loadDashboard() {
  onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const points = data.points || 0;

      // Update points shown in both the flow section and the dashboard
      const dashboardPointsEl = document.getElementById("dashboardPoints");
      if (dashboardPointsEl) dashboardPointsEl.innerText = points;

      const topPointsEl = document.getElementById("points");
      if (topPointsEl) topPointsEl.innerText = points;

      renderBadges(points);

      const btn = document.getElementById("downloadCertBtn");
      if (!btn) return;

      if (points >= 150) {
        btn.disabled = false;
        btn.classList.remove("locked");
        btn.innerText = "🎉 Download Certificate";
        btn.style.background = "#16a34a";
        btn.style.cursor = "pointer";
      } else {
        btn.disabled = true;
        btn.classList.add("locked");
        btn.innerText = `🔒 Need ${150 - points} more points`;
        btn.style.background = "#9ca3af";
        btn.style.cursor = "not-allowed";
      }
    });
  });
}
