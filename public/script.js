const fileInput = document.getElementById('image-input');
const fileDropArea = document.getElementById('file-drop-area');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const submitBtn = document.getElementById('submit-btn');
const uploadForm = document.getElementById('upload-form');

const uploadSection = document.getElementById('upload-section');
const statusSection = document.getElementById('status-section');
const resultsSection = document.getElementById('results-section');
const terminalLogs = document.getElementById('terminal-logs');

// Handle file selection and preview
fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            previewContainer.style.display = 'block';
            fileDropArea.style.display = 'none'; // Hide the upload box
            submitBtn.disabled = false;
        }
        reader.readAsDataURL(file);
    }
});

// Drag and drop styles
fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.classList.add('drag-over');
});

fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.classList.remove('drag-over');
});

fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.classList.remove('drag-over');
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
});

// Add logs to terminal
function addLog(message, isError = false) {
    const p = document.createElement('p');
    p.className = isError ? 'log-line error' : 'log-line';
    p.textContent = `> ${message}`;
    terminalLogs.appendChild(p);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// Handle form submission
let startTime;
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!fileInput.files[0]) return;

    startTime = Date.now();
    const headlessToggle = document.getElementById('headless-toggle');
    const isHeadless = headlessToggle ? headlessToggle.checked : true;

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('headless', isHeadless);

    // UI transitions
    uploadSection.style.display = 'none';
    statusSection.style.display = 'block';

    addLog('Uploading image to server...');
    
    // Simulate terminal logs for better UX while waiting for backend
    setTimeout(() => addLog('Server received payload. Initializing stealth browser...'), 1500);
    setTimeout(() => addLog('Bypassing anti-bot security systems...'), 4000);
    setTimeout(() => addLog('Navigating to target domain...'), 7000);
    setTimeout(() => addLog('Injecting image data...'), 12000);
    setTimeout(() => addLog('Processing image and awaiting results...'), 18000);
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            addLog('Search complete. Results captured successfully.');
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // Show results
            setTimeout(() => {
                statusSection.style.display = 'none';
                resultsSection.style.display = 'block';
                document.getElementById('result-screenshot').src = result.data.screenshotUrl;
                document.getElementById('metric-duration').textContent = `${duration}s`;
                
                const videoEl = document.getElementById('result-video');
                const btnVideo = document.getElementById('btn-video');
                if (result.data.videoUrl) {
                    videoEl.src = result.data.videoUrl;
                    btnVideo.style.display = 'inline-block';
                } else {
                    btnVideo.style.display = 'none';
                }
            }, 1000);

        } else {
            throw new Error(result.error || 'Automation failed');
        }

    } catch (error) {
        addLog(`ERROR: ${error.message}`);
        addLog('Process terminated.');
        
        const loader = document.querySelector('.loader');
        loader.style.borderColor = 'var(--danger)';
        loader.style.borderTopColor = 'transparent';
        document.getElementById('status-text').textContent = 'Automation Failed';
        document.getElementById('status-text').style.color = 'var(--danger)';
    }
});

// Tab navigation for Screenshot vs Live Video
const btnScreenshot = document.getElementById('btn-screenshot');
const btnVideo = document.getElementById('btn-video');
const resultScreenshot = document.getElementById('result-screenshot');
const resultVideo = document.getElementById('result-video');

btnScreenshot.addEventListener('click', () => {
    btnScreenshot.classList.add('active');
    btnVideo.classList.remove('active');
    resultScreenshot.style.display = 'block';
    resultVideo.style.display = 'none';
    resultVideo.pause();
});

btnVideo.addEventListener('click', () => {
    btnVideo.classList.add('active');
    btnScreenshot.classList.remove('active');
    resultScreenshot.style.display = 'none';
    resultVideo.style.display = 'block';
});

// Download Logs as Text File
const btnDownloadLogs = document.getElementById('btn-download-logs');
btnDownloadLogs.addEventListener('click', () => {
    const logLines = Array.from(document.querySelectorAll('.log-line'))
        .map(el => el.textContent)
        .join('\n');
    
    const blob = new Blob([logLines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pimeyes-automation-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
