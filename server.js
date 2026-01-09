const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const https = require('https');

const app = express();

const PORT = process.env.PORT || 443;
const STORAGE_PATH = path.join(__dirname, 'storage');
const CHIBIS_PATH = path.join(__dirname, 'chibis');

// SSL
const sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// Folders creation
if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
}
if (!fs.existsSync(CHIBIS_PATH)) {
    fs.mkdirSync(CHIBIS_PATH, { recursive: true });
}

function cleanFilename(name) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);

    const cleanBase = base
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();

    return `${cleanBase || 'file'}${ext.toLowerCase()}`;
}

// File storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderId = nanoid(8);
        const filePath = path.join(STORAGE_PATH, folderId);
        fs.mkdirSync(filePath, { recursive: true });
        req.folderId = folderId;
        cb(null, filePath);
    },
    filename: (req, file, cb) => {
        const safeName = cleanFilename(file.originalname);
        cb(null, safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 8 * 1024 * 1024 * 1024 }
}).single('file');

// Static files
app.use(express.static('public'));
app.use('/s', express.static('storage'));
app.use('/chibis', express.static('chibis'));
app.use('/fonts', express.static('fonts'));

// Chibiiis :3
app.get('/chibi', (req, res) => {
    fs.readdir(CHIBIS_PATH, (err, files) => {
        if (err || !files.length) {
            return res.redirect('/chibis/default.png');
        }

        const images = files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
        if (images.length === 0) {
            return res.redirect('/chibis/default.png');
        }

        const randomPick = images[Math.floor(Math.random() * images.length)];

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.redirect(`/chibis/${randomPick}`);
    });
});

// File upload
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too big' : 'Upload failed';
            return res.status(500).json({ error: message });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file received' });
        }

        res.json({
            url: `/s/${req.folderId}/${encodeURIComponent(req.file.filename)}`,
            name: req.file.originalname,
            size: req.file.size
        });
    });
});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// HTTPS server
const server = https.createServer(sslOptions, app);

server.listen(PORT, () => {
    console.log(`Nekobox running on https://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err.message);
});
