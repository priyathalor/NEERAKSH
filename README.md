# 💧 NEERAKSH – Water Conservation Initiative

A gamified water-conservation web app: users log in by phone (Firebase Auth),
complete a 4-step challenge (login → upload a photo → describe the action →
submit), earn points that are scored automatically, unlock badges, and
download a certificate once they cross 150 points.

---

## 🛠️ Tech Stack

* HTML5, Tailwind CSS, vanilla JavaScript (ES modules)
* Firebase Authentication (Phone/OTP), Firestore (real-time data), Firebase
  Storage (photo uploads)
* Optional REST API (Flask, `ml-service/`) for submission scoring, with a
  built-in client-side fallback so the app works with zero backend

---

## 🚀 Running locally

This is a static site — no build step required.

```bash
# from the project root
npx serve .
# or
python3 -m http.server 8080
```

Open the printed URL in your browser. Phone login requires a working
Firebase project (see setup below) and a network connection.

### Optional: run the local scoring REST API

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

The frontend automatically tries `http://127.0.0.1:6000/analyze` first and
falls back to an equivalent client-side scorer (`js/scoring.js`) if the
service isn't running — so this step is optional.

### Optional: run the Node/Express backend

`backend/` is a separate Express + MongoDB service for future
server-side-only features (it verifies Firebase ID tokens via
`firebase-admin`). It is **not** required for the site to work — the
frontend talks to Firebase directly.

```bash
cd backend
npm install
npm start
```

---

## 🔥 Firebase project setup (required for login to work)

1. **Create/select a project** at https://console.firebase.google.com and
   update `js/firebase.js` with your project's config if you're not using
   the existing `neeraksh-1736` project.
2. **Enable Phone sign-in**: Authentication → Sign-in method → Phone → Enable.
3. **Add authorized domains**: Authentication → Settings → Authorized
   domains — add your production domain (e.g. `neeraksh-app.web.app`).
   `localhost` is included by default.
4. **Billing**: real SMS delivery via Phone Auth requires the Blaze
   (pay-as-you-go) plan. You can add test phone numbers under Authentication
   → Sign-in method → Phone → Phone numbers for testing to develop without
   billing.
5. **Deploy security rules** (included in this repo):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,storage:rules,hosting
   ```
   Without deployed rules, Firestore/Storage reject all reads and writes by
   default, which is a common cause of "login succeeds but nothing saves."

---

## 🎮 How the gamification works

| Step | Action | Points |
|------|--------|--------|
| 1 | Login / Sign up | 50 |
| 2 | Upload a photo of a water-saving action | 30 |
| 3 | Add a title & description | 20 |
| 4 | Submit (auto-scored 10–100, added to points) | up to 100 |

**Badges** unlock automatically as points accumulate: 💧 Water Drop (0),
🥉 Bronze Guardian (50), 🥈 Silver Guardian (100), 🥇 Gold Guardian (150).

**Certificate**: once total points reach 150, the "Download Certificate"
button generates a personalized PDF client-side via jsPDF.

---

## 📁 Project structure

```
index.html            Main page (all sections + modals)
style.css              Styles
js/
  firebase.js          Firebase app init
  auth.js               Phone/OTP login, signup, logout
  state.js               In-memory current-user state
  steps.js               Step completion + points + progress bar
  dashboard.js            Live points/badges/certificate-unlock UI
  scoring.js               Client-side submission scorer (fallback)
  certificate.js            jsPDF certificate generator
  ui.js                       Modal show/hide helpers
  guards.js                    requireAuth() guard
  main.js                       Wires everything together
ml-service/            Optional Flask REST scoring API
backend/                Optional Express + MongoDB service (not required)
firestore.rules         Firestore security rules
storage.rules            Storage security rules
firebase.json             Hosting + rules config
```

---

### 💙 "Every Drop Counts – Save Water, Save Life."
