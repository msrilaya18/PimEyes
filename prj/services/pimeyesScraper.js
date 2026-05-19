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
async function searchPimEyes(imagePath) {
    console.log(`[+] Starting PimEyes automation with image: ${imagePath}`);
    let browser;
    try {
        // Launch stealth browser
        browser = await chromium.launch({ 
            headless: true, // Use true for production, false for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
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
            await cookieButton.waitFor({ state: 'visible', timeout: 5000 });
            console.log(`[+] Cookie banner found, accepting...`);
            await cookieButton.click();
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log(`[!] No cookie banner appeared within 5s. Proceeding...`);
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
            
            const checkboxes = page.locator('label.checkbox');
            const count = await checkboxes.count();
            console.log(`[+] Found ${count} consent checkbox labels.`);
            
            for (let i = 0; i < count; i++) {
                const cb = checkboxes.nth(i);
                if (await cb.isVisible()) {
                    console.log(`[+] Clicking visible checkbox label ${i + 1}...`);
                    await cb.click();
                    await page.waitForTimeout(500);
                }
            }

            await page.waitForTimeout(1000);

            // Click the "Start Search" button
            const startSearchButton = page.locator('button:has-text("Start Search")').first();
            if (await startSearchButton.isVisible()) {
                console.log(`[+] Search button is visible, clicking...`);
                await startSearchButton.click();
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
