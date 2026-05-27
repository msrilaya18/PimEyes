# 🤖 PimEyes AutoPilot: Advanced Search Automation

Working - https://drive.google.com/file/d/12xtayuB7hqcjTnG7mSfI6q5R8i345ie7/view?usp=sharing

A production-grade reverse image search automation engine designed for PimEyes. Built with a dark-glass dashboard, real-time terminal log stream, browser recording playback, and advanced anti-bot evasion.

## ⚡ System Architecture

```mermaid
graph TD
    A[Web UI Client] -- 1. Uploads Image & Configures Settings --> B[Express API Server]
    B -- 2. Triggers Automation Script --> C[Playwright Stealth Engine]
    C -- 3. Programmatically accepts Cookiebot --> D[PimEyes Target Page]
    C -- 4. Intercepts and Clicks Turnstile IFrame --> D
    C -- 5. Performs Search & Records Session --> D
    D -- 6. Captures Screenshot & Video --> C
    C -- 7. Saves Assets to static directory --> B
    B -- 8. Returns results and video stream --> A
```

## ✨ Features

- **Playwright Stealth Integration:** Spoof user-agents, hide automation footprints, mimic real WebGL and Canvas rendering parameters, and randomize delays to evade Cloudflare browser fingerprinting.
- **Dynamic Cookiebot Bypass:** Programmatically wipe blocking overlay dialogs and sync dynamic state-bindings on Terms and Conditions checkboxes.
- **Nested IFrame Targeting:** Employ frameLocator mechanics to find, wait for, and execute targeted clicks inside the Cloudflare Turnstile verification challenge box.
- **Live WebM Screen Recording:** Automatically capture high-definition screen video of the browser's form submissions, saving it as a WebM clip for immediate UI playback.
- **Real-Time Terminal View:** Feed backend browser logs dynamically into a custom terminal emulator on the dashboard.
- **Interactive Metrics Dashboard:** Display execution duration, security clearance status, and data-sync statistics upon search completion.
- **Session Log Exporter:** Feature a button to package terminal logs into a clean, timestamped log file for immediate local download.
- **Developer Headless Toggle:** Include a switch enabling developers to toggle headless mode off for visual desktop debugging.

## 🕵️‍♂️ Reverse Engineering and Network Analysis

Using HTTP Toolkit to intercept network calls, the request-response lifecycle was reverse-engineered to identify core automation friction points:

### 1. The Dynamic Consent Wall
PimEyes uses a multi-tier consent wall requiring user agreement on terms of service, age confirmation, and facial biometric processing. Standard selectors often fail because the elements dynamically bind to reactive Vue or React components. The engine waits for elements to fully render, uses native Playwright actions to force check the dynamic checkbox inputs directly, and bypasses duplicate events that cancel out selections.

### 2. TLS and JA3 Fingerprinting
Attempts to execute direct HTTP POST requests to the upload endpoint via Axios or Python libraries are blocked instantly with a 403 Forbidden response. Cloudflare analyzes the TLS Client Hello handshake (JA3 fingerprint) and flags non-browser clients. The engine runs the search inside a Playwright-controlled browser, allowing Cloudflare to naturally negotiate the handshake and validate TLS signatures while we execute DOM automation.

## 📦 Local Installation

### Prerequisites
- Node.js (version 18 or higher)
- npm (version 9 or higher)

### Setup Steps
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/msrilaya18/PimEyes.git
   cd PimEyes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   node server.js
   ```

4. Access the web dashboard at:
   http://localhost:3000

## 🐋 Cloud Deployment (Docker and Railway)

This repository includes a multi-stage Dockerfile optimized for headless browser runners.

### Deploying to Railway:
1. Create a free account at railway.app and log in using your GitHub account.
2. Click New Project, select Deploy from GitHub repo, and choose your PimEyes repository.
3. Click Deploy Now. Railway will automatically locate the Dockerfile at the root and build the application.
4. Once deployed, click on the PimEyes service box and navigate to the Settings tab.
5. Under Networking, click Generate Domain to get a permanent, 24/7 public link.

---

*Architected as a core component of the Automation Engineer Internship Selection Process.*
