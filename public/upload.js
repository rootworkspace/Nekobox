const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');

// Click to upload
uploadBox.addEventListener('click', () => fileInput.click());

// Drag and drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        uploadFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        uploadFile(e.target.files[0]);
        fileInput.value = '';
    }
});

function uploadFile(file) {
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB in bytes

    if (file.size > MAX_SIZE) {
        alert('File exceeds 100 MB limit.');
        return;
    }

    const cardId = 'card_' + Date.now();

    // Create card
    const card = document.createElement('div');
    card.className = 'file-card';
    card.id = cardId;
    card.innerHTML = `
        <div class="file-header">
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-size">${formatSize(file.size)}</div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" id="progress_${cardId}"></div>
        </div>
        <div style="text-align:center;color:#888;font-size:14px;" id="text_${cardId}">Uploading...</div>
    `;

    // Clear empty state if exists
    if (filesList.children.length === 0) {
        filesList.innerHTML = '';
    }

    filesList.prepend(card);

    // Upload
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            document.getElementById(`progress_${cardId}`).style.width = percent + '%';
            document.getElementById(`text_${cardId}`).textContent = `Uploading ${percent}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            showUrl(cardId, data, file);
        } else {
            showError(cardId);
        }
    };

    xhr.onerror = () => showError(cardId);

    xhr.open('POST', '/upload');
    xhr.send(formData);
}

function showUrl(cardId, data, file) {
    const card = document.getElementById(cardId);
    const fullUrl = window.location.origin + data.url;

    card.innerHTML = `
        <div class="file-header">
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-size">${formatSize(file.size)}</div>
        </div>
        <div class="url-box">
            <input type="text" value="${fullUrl}" readonly class="url-input" id="url_${cardId}">
            <button class="copy-btn" onclick="copyUrl('${cardId}')">Copy URL</button>
        </div>
    `;
}

function showError(cardId) {
    const card = document.getElementById(cardId);
    card.innerHTML = `
        <div class="file-header">
            <div class="file-name">Upload failed</div>
            <div class="file-size">Error</div>
        </div>
    `;
}

function copyUrl(cardId) {
    const input = document.getElementById(`url_${cardId}`);
    const button = input.nextElementSibling;

    input.select();
    document.execCommand('copy');

    button.textContent = 'Copied!';
    button.classList.add('copied');

    setTimeout(() => {
        button.textContent = 'Copy URL';
        button.classList.remove('copied');
    }, 2000);
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}