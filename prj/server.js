const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { searchPimEyes } = require('./services/pimeyesScraper');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Ensure results directory exists
const resultsDir = path.join(__dirname, 'public', 'results');
if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// API Route to handle the search
app.post('/api/search', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const imagePath = req.file.path;
        console.log(`[+] Received image for search: ${imagePath}`);

        // Call the automation scraper
        const result = await searchPimEyes(imagePath);

        // Optionally, clean up the uploaded image after processing
        // fs.unlinkSync(imagePath);

        res.json({
            success: true,
            message: 'Search completed successfully',
            data: result
        });
    } catch (error) {
        console.error('[-] Error during search:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred during automation'
        });
    }
});

app.listen(port, () => {
  console.log(`[+] Automation server running at http://localhost:${port}`);
});
