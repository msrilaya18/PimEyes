const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const path = require('path');
const fs = require('fs');

// Add stealth plugin to playwright
chromium.use(stealth);

/**
 * Automates the PimEyes reverse image search flow
 * @param {string} imagePath - Path to the image file to search
 * @returns {Promise<object>} - Results containing screenshot path
 */
async function searchPimEyes(imagePath, headless = true) {
    console.log(`[+] Starting PimEyes automation with image: ${imagePath} (headless: ${headless})`);
    let browser;
    try {
        // Launch stealth browser
        browser = await chromium.launch({ 
            headless: headless,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-gpu'
            ] 
        });
        
        // Setup video recording directory
        const videoDir = path.join(__dirname, '..', 'public', 'results', 'videos');
        if (!fs.existsSync(videoDir)) {
            fs.mkdirSync(videoDir, { recursive: true });
        }

        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            recordVideo: {
                dir: videoDir,
                size: { width: 1280, height: 800 }
            }
        });
        const page = await context.newPage();

        // Navigate to PimEyes
        console.log(`[+] Navigating to pimeyes.com...`);
        await page.goto('https://pimeyes.com/en', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Accept Cookie Banner if it exists
        try {
            const cookieButton = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, button:has-text("Allow all"), button:has-text("Accept all"), button:has-text("Accept")').first();
            await cookieButton.waitFor({ state: 'visible', timeout: 8000 });
            console.log(`[+] Cookie banner found, accepting...`);
            await cookieButton.click({ force: true });
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log(`[!] No cookie banner accepted via click:`, e.message);
        }

        // Programmatically remove any remaining Cookiebot elements to prevent click interception
        try {
            await page.evaluate(() => {
                const overlays = document.querySelectorAll('[id*="CybotCookiebot"], [class*="Cookiebot"], .cookie-consent, #cookie-law-info-bar');
                overlays.forEach(el => el.remove());
                console.log('[-] Removed cookie overlay elements from DOM.');
            });
        } catch (e) {
            console.log(`[!] Failed to remove cookie overlay elements:`, e.message);
        }

        // Upload image
        console.log(`[+] Uploading image...`);
        const fileInputLocator = page.locator('#file-input').first();
        await fileInputLocator.setInputFiles(path.resolve(imagePath));

        // After uploading, we agree to terms
        console.log(`[+] Handling checkboxes and terms...`);
        try {
            // Wait for checkbox labels to be visible (indicates upload modal is open)
            await page.waitForSelector('label.checkbox', { state: 'visible', timeout: 15000 });

            // Find all checkbox labels
            const labels = page.locator('label.checkbox');
            const count = await labels.count();
            console.log(`[+] Found ${count} total checkbox labels.`);
            
            let checkedCount = 0;
            for (let i = 0; i < count; i++) {
                const label = labels.nth(i);
                if (await label.isVisible()) {
                    try {
                        console.log(`[+] Programmatically checking visible checkbox ${checkedCount + 1}...`);
                        const cb = label.locator('input[type="checkbox"]').first();
                        await cb.check({ force: true, timeout: 3000 });
                        await page.waitForTimeout(500);
                        checkedCount++;
                    } catch (cbErr) {
                        console.log(`[!] Failed to check checkbox ${checkedCount + 1}:`, cbErr.message);
                    }
                }
            }

            await page.waitForTimeout(1000);

            // Check for Cloudflare Turnstile iframe above the button
            try {
                console.log(`[+] Scanning for Cloudflare Turnstile verification...`);
                const turnstileIframe = page.frameLocator('iframe[src*="challenges.cloudflare.com"]').first();
                const turnstileCheckbox = turnstileIframe.locator('#challenge-stage, .ctp-checkbox-label, input[type="checkbox"]').first();
                await turnstileCheckbox.waitFor({ state: 'visible', timeout: 6000 });
                console.log(`[+] Turnstile checkbox found, clicking "I am human"...`);
                await turnstileCheckbox.click({ force: true });
                await page.waitForTimeout(3000);
            } catch (iframeErr) {
                console.log(`[!] Turnstile checkbox not visible or not interactive:`, iframeErr.message);
            }

            // Click the "Start Search" button
            const startSearchButton = page.locator('button:has-text("Start Search")').first();
            if (await startSearchButton.isVisible()) {
                console.log(`[+] Search button is visible, clicking...`);
                await startSearchButton.click({ force: true });
            } else {
                console.log(`[!] Search button not visible, attempting JS click...`);
                await page.evaluate(() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('start search'));
                    if (btn) btn.click();
                });
            }
            
            console.log(`[+] Search initiated.`);
            
        } catch (e) {
            console.log(`[!] Terms/Checkboxes error or upload took too long:`, e.message);
        }

        console.log(`[+] Awaiting redirection or captcha stage...`);
        try {
            await page.waitForURL('**/results/**', { timeout: 10000 });
            console.log(`[+] Successfully navigated to results page.`);
        } catch(e) {
            console.log(`[!] URL did not change to results. Likely blocked by CAPTCHA or loading slowly. Proceeding to take current screenshot.`);
        }
        
        // Wait for results or captcha to load fully
        await page.waitForTimeout(3000); 

        // Take a screenshot of the results
        const screenshotFileName = `results-${Date.now()}.png`;
        const screenshotPath = path.join(__dirname, '..', 'public', 'results', screenshotFileName);
        
        console.log(`[+] Capturing screen state...`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // We can also extract some basic text/stats from the page if needed
        let resultsCount = 'Unknown';
        try {
            resultsCount = await page.locator('.results-count, .found-faces-count').first().innerText();
        } catch (e) {
            // Ignore if we can't find it
        }

        // Get video before closing page
        const video = page.video();
        await page.close();

        let videoUrl = '';
        if (video) {
            try {
                const videoPath = await video.path();
                const videoFileName = `video-${Date.now()}.webm`;
                const destPath = path.join(__dirname, '..', 'public', 'results', videoFileName);
                // Ensure results directory exists
                const resultsDir = path.dirname(destPath);
                if (!fs.existsSync(resultsDir)) {
                    fs.mkdirSync(resultsDir, { recursive: true });
                }
                fs.copyFileSync(videoPath, destPath);
                videoUrl = `/results/${videoFileName}`;
                console.log(`[+] Video recording saved: ${videoUrl}`);
            } catch (e) {
                console.log(`[!] Failed to copy video file:`, e.message);
            }
        }

        console.log(`[+] Automation completed.`);
        
        return {
            screenshotUrl: `/results/${screenshotFileName}`,
            videoUrl: videoUrl,
            extractedCount: resultsCount,
            status: "Search workflow completed. Screen state and video captured."
        };

    } catch (error) {
        console.error(`[-] Automation failed:`, error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    searchPimEyes
};
