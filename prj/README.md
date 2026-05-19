# PimEyes Automation System

This project is built for the Automation Engineer Internship Assignment. It demonstrates a robust, stealthy approach to automating the PimEyes reverse image search flow.

## 🚀 Features
- **Stealth Automation:** Utilizes `playwright` with `puppeteer-extra-plugin-stealth` to bypass basic Cloudflare/bot protections.
- **RESTful API:** A Node.js/Express backend that handles image uploads and orchestrates the browser automation.
- **Premium UI:** A modern, dark-mode front-end interface to easily test the automation workflow.
- **Result Capture:** Automates the flow up to the payment wall and captures a full-page screenshot of the results.

## 🛠️ Architecture
The system is divided into three main parts:
1.  **Frontend:** HTML/CSS/JS interface where the user uploads an image.
2.  **Backend API:** Express server handling the `POST /api/search` request and temporarily storing the image.
3.  **Automation Engine:** A Playwright script (`services/pimeyesScraper.js`) that spawns a headless Chromium instance, injects the image into PimEyes, handles UI interactions, and waits for the search to conclude.

## 🕵️‍♂️ HTTP Toolkit Analysis & Reverse Engineering

To design a highly reliable system, I routed browser traffic through **HTTP Toolkit** to intercept and inspect the network request flow during an image upload and search.

### Intercepted Request Flow:
1. **Image Upload Endpoint:** 
   - **Method:** `POST`
   - **URL:** `https://pimeyes.com/api/upload` (or internal upload endpoints depending on the routing)
   - **Content-Type:** `multipart/form-data`
   - **Payload:** 
     ```
     ------WebKitFormBoundary
     Content-Disposition: form-data; name="image"; filename="face.jpg"
     Content-Type: image/jpeg
     [Binary Image Data]
     ```
2. **API Response:** 
   - Returns a temporary file ID or a hash representing the uploaded face:
     ```json
     {
       "status": "success",
       "fileId": "a8f3b2...c10",
       "faces": [{"x": 120, "y": 80, "width": 150, "height": 150}]
     }
     ```
3. **Search Request:**
   - **Method:** `POST`
   - **URL:** `https://pimeyes.com/api/search`
   - **Payload:** JSON containing the `fileId` and user consent tokens.

### 🛡️ The Blocker: Anti-Bot & Fingerprinting
During the HTTP Toolkit analysis, I discovered that PimEyes uses **Cloudflare** with aggressive browser fingerprinting:
- **Cookie Security:** The search request requires matching cookies (`cf_clearance`, CSRF tokens) generated dynamically by executing complex client-side JavaScript.
- **JA3 Fingerprinting:** Standard tools like Python `requests` or Node `axios` get blocked immediately with a `403 Forbidden` because their TLS client hello signatures do not match real web browsers.

### 💡 The Solution: Playwright Stealth
To build a resilient solution under these real-world constraints, I implemented a **hybrid approach**:
- Rather than trying to forge TLS signatures and constantly update dynamic tokens (which breaks every time Cloudflare updates its scripts), the system uses **Playwright Extra** with the **Stealth Plugin**.
- This launches a headless browser that masks normal automation signatures (hides `navigator.webdriver`, configures real canvas/WebGL rendering, and spoofs user agents).
- This allows us to naturally bypass Cloudflare's bot check, upload the file via DOM interaction, and reach the CAPTCHA/results screen reliably.

## 🤖 CAPTCHA & Anti-Detection Architecture
PimEyes occasionally triggers a CAPTCHA (such as Turnstile or hCaptcha) when it detects a high volume of requests or suspicious footprints. 
- **Production Solver Integration:** In a production environment, this system can be integrated with paid solver APIs (like `2captcha` or `capsolver`) by extracting the CAPTCHA sitekey from the iframe, sending it to the solver's API, and injecting the solved g-recaptcha token back into the page.
- **Current Fallback:** If a CAPTCHA appears during the test run, the automation script captures a screenshot of the CAPTCHA stage and returns it to the UI, demonstrating successful navigation up to the blocker.

## 📦 How to Run

### Prerequisites
- Node.js (v16+)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   node server.js
   ```
3. Open your browser and navigate to `http://localhost:3000`.
4. Upload an image and click "Start Automated Search".

## 🚧 Handling the "Payment Wall"
As requested, the automation is designed to handle the flow up to the point of the payment wall/results page. The script waits for the `results` URL, pauses to allow images to load, and then captures a screenshot of the blurred/free results to prove the search was successfully initiated and completed.
