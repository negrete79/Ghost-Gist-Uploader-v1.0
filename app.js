// Variáveis globais
let githubToken = localStorage.getItem('githubToken') || '';
let gistsList = [];
let selectedFile = null;
let deferredPrompt;

// Elementos do DOM
const uploadBtn = document.getElementById('uploadBtn');
const deleteBtn = document.getElementById('deleteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const guideBtn = document.getElementById('guideBtn');
const installBtn = document.getElementById('installBtn');
const manageTokenBtn = document.getElementById('manageTokenBtn');
const installAppBtn = document.getElementById('installAppBtn');

const uploadSection = document.getElementById('uploadSection');
const deleteSection = document.getElementById('deleteSection');
const downloadSection = document.getElementById('downloadSection');

const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const processUploadBtn = document.getElementById('processUploadBtn');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');

const gistsListDelete = document.getElementById('gistsListDelete');
const refreshDeleteBtn = document.getElementById('refreshDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

const gistsListDownload = document.getElementById('gistsListDownload');
const refreshDownloadBtn = document.getElementById('refreshDownloadBtn');
const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');
const downloadSingleBtn = document.getElementById('downloadSingleBtn');
const downloadSeparateBtn = document.getElementById('downloadSeparateBtn');
const downloadCombinedBtn = document.getElementById('downloadCombinedBtn');

const tokenModal = new bootstrap.Modal(document.getElementById('tokenModal'));
const guideModal = new bootstrap.Modal(document.getElementById('guideModal'));
const installModal = new bootstrap.Modal(document.getElementById('installModal'));

const githubTokenInput = document.getElementById('githubToken');
const saveTokenCheckbox = document.getElementById('saveToken');
const saveTokenBtn = document.getElementById('saveTokenBtn');

const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

// --- LÓGICA DO PWA ---
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Evento "beforeinstallprompt" disparado. App é instalável.');
    e.preventDefault();
    deferredPrompt = e;
    installAppBtn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA foi instalado com sucesso.');
    showNotification('Aplicativo instalado com sucesso!', 'success');
    installAppBtn.classList.add('hidden');
    deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);
            })
            .catch(error => {
                console.error('Falha ao registrar Service Worker:', error);
            });
    });
}

// --- EVENT LISTENERS ---
installAppBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
        showNotification('A instalação não está disponível no momento.', 'warning');
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        showNotification('Aplicativo instalado com sucesso!', 'success');
    }
    deferredPrompt = null;
    installAppBtn.classList.add('hidden');
});

uploadBtn.addEventListener('click', () => {
    hideAllSections();
    uploadSection.classList.remove('hidden');
});

deleteBtn.addEventListener('click', () => {
    if (!githubToken) {
        tokenModal.show();
        return;
    }
    hideAllSections();
    deleteSection.classList.remove('hidden');
    loadGistsForDelete();
});

downloadBtn.addEventListener('click', () => {
    if (!githubToken) {
        tokenModal.show();
        return;
    }
    hideAllSections();
    downloadSection.classList.remove('hidden');
    loadGistsForDownload();
});

guideBtn.addEventListener('click', () => {
    guideModal.show();
});

installBtn.addEventListener('click', () => {
    installModal.show();
});

manageTokenBtn.addEventListener('click', manageToken);

cancelUploadBtn.addEventListener('click', () => {
    hideAllSections();
    selectedFile = null;
    fileInfo.innerHTML = '';
});

cancelDeleteBtn.addEventListener('click', () => {
    hideAllSections();
});

cancelDownloadBtn.addEventListener('click', () => {
    hideAllSections();
});

fileUploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

processUploadBtn.addEventListener('click', () => {
    if (!selectedFile) {
        showNotification('Selecione um arquivo primeiro', 'error');
        return;
    }
    if (!githubToken) {
        tokenModal.show();
        return;
    }
    uploadFile();
});

refreshDeleteBtn.addEventListener('click', () => {
    loadGistsForDelete();
});

refreshDownloadBtn.addEventListener('click', () => {
    loadGistsForDownload();
});

downloadSingleBtn.addEventListener('click', () => {
    if (gistsList.length === 0) {
        showNotification('Nenhum Gist disponível para download', 'warning');
        return;
    }
    downloadGist(gistsList[0]);
});

downloadSeparateBtn.addEventListener('click', () => {
    if (gistsList.length === 0) {
        showNotification('Nenhum Gist disponível para download', 'warning');
        return;
    }
    gistsList.forEach(gist => {
        downloadGist(gist);
    });
    showNotification(`Download de ${gistsList.length} Gists iniciado`, 'success');
});

downloadCombinedBtn.addEventListener('click', () => {
    if (gistsList.length === 0) {
        showNotification('Nenhum Gist disponível para download', 'warning');
        return;
    }
    downloadAllGistsCombined();
});

saveTokenBtn.addEventListener('click', () => {
    const token = githubTokenInput.value.trim();
    if (!token) {
        showNotification('Token não pode ser vazio', 'error');
        return;
    }
    if (saveTokenCheckbox.checked) {
        localStorage.setItem('githubToken', token);
    }
    githubToken = token;
    tokenModal.hide();
    showNotification('Token salvo com sucesso', 'success');
});

// --- FUNÇÕES ---
function hideAllSections() {
    uploadSection.classList.add('hidden');
    deleteSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
}

function handleFileSelect(file) {
    if (!file.name.match(/\.(txt)$/i)) {
        showNotification('Por favor, selecione um arquivo .txt', 'error');
        return;
    }
    selectedFile = file;
    fileInfo.innerHTML = `
        <div class="alert alert-info">
            <strong>Arquivo:</strong> ${file.name}<br>
            <strong>Tamanho:</strong> ${formatFileSize(file.size)}
        </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function uploadFile() {
    if (!selectedFile || !githubToken) return;
    processUploadBtn.disabled = true;
    processUploadBtn.innerHTML = '<span class="loading-spinner"></span> Enviando...';
    try {
        const content = await readFileContent(selectedFile);
        const payload = {
            description: `Arquivo original: ${selectedFile.name}`,
            public: true,
            files: { "upload.txt": { content: content } }
        };
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify(payload)
        });
        if (response.status === 201) {
            const data = await response.json();
            const gistId = data.id;
            const ownerLogin = data.owner.login;
            const shortRawUrl = `https://gist.githubusercontent.com/${ownerLogin}/${gistId}/raw/`;
            let tinyUrl = '';
            try {
                const tinyResponse = await fetch(`http://tinyurl.com/api-create.php?url=${encodeURIComponent(shortRawUrl)}`);
                if (tinyResponse.status === 200) tinyUrl = await tinyResponse.text();
            } catch (error) { console.error('Erro ao gerar TinyURL:', error); }
            const timestamp = new Date().toLocaleString();
            const logEntry = { timestamp, fileName: selectedFile.name, rawUrl: shortRawUrl, tinyUrl };
            let savedUrls = JSON.parse(localStorage.getItem('gistUrls') || '[]');
            savedUrls.push(logEntry);
            localStorage.setItem('gistUrls', JSON.stringify(savedUrls));
            fileInfo.innerHTML += `
                <div class="alert alert-success mt-3">
                    <strong>✅ Arquivo enviado com sucesso!</strong><br>
                    🔗 URL Raw: <a href="${shortRawUrl}" target="_blank">${shortRawUrl}</a><br>
                    ${tinyUrl ? `🤏 URL TinyURL: <a href="${tinyUrl}" target="_blank">${tinyUrl}</a>` : ''}
                </div>
            `;
            showNotification('Arquivo enviado com sucesso!', 'success');
        } else {
            const errorData = await response.json();
            showNotification(`Erro ao enviar arquivo: ${errorData.message}`, 'error');
        }
    } catch (error) {
        showNotification(`Erro de conexão: ${error.message}`, 'error');
    } finally {
        processUploadBtn.disabled = false;
        processUploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Enviar para Gist';
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

async function loadGistsForDelete() {
    gistsListDelete.innerHTML = '<p class="text-center"><span class="loading-spinner"></span> Carregando seus Gists...</p>';
    try {
        const response = await fetch('https://api.github.com/gists', {
            headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (response.status === 200) {
            gistsList = await response.json();
            if (gistsList.length === 0) {
                gistsListDelete.innerHTML = '<p class="text-center">Nenhum Gist encontrado.</p>';
                return;
            }
            let html = '';
            gistsList.forEach((gist) => {
                const description = gist.description || 'Sem descrição';
                html += `
                    <div class="gist-item">
                        <div class="gist-description">${description}</div>
                        <div class="gist-url">${gist.html_url}</div>
                        <div class="text-end">
                            <button class="action-btn delete" onclick="deleteGist('${gist.id}', '${description}')">
                                <i class="fas fa-trash-alt"></i> Excluir
                            </button>
                        </div>
                    </div>
                `;
            });
            gistsListDelete.innerHTML = html;
        } else {
            gistsListDelete.innerHTML = `<p class="text-center text-danger">Erro ao carregar Gists: ${response.status}</p>`;
        }
    } catch (error) {
        gistsListDelete.innerHTML = `<p class="text-center text-danger">Erro de conexão: ${error.message}</p>`;
    }
}

async function loadGistsForDownload() {
    gistsListDownload.innerHTML = '<p class="text-center"><span class="loading-spinner"></span> Carregando seus Gists...</p>';
    try {
        const response = await fetch('https://api.github.com/gists', {
            headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (response.status === 200) {
            gistsList = await response.json();
            if (gistsList.length === 0) {
                gistsListDownload.innerHTML = '<p class="text-center">Nenhum Gist encontrado.</p>';
                return;
            }
            let html = '';
            gistsList.forEach((gist, index) => {
                const description = gist.description || 'Sem descrição';
                const fileName = Object.keys(gist.files)[0] || 'arquivo';
                html += `
                    <div class="gist-item">
                        <div class="gist-description">${description}</div>
                        <div class="gist-url">${gist.html_url}</div>
                        <div class="text-end">
                            <button class="action-btn download" onclick="downloadGist(${index})">
                                <i class="fas fa-download"></i> Baixar
                            </button>
                        </div>
                    </div>
                `;
            });
            gistsListDownload.innerHTML = html;
        } else {
            gistsListDownload.innerHTML = `<p class="text-center text-danger">Erro ao carregar Gists: ${response.status}</p>`;
        }
    } catch (error) {
        gistsListDownload.innerHTML = `<p class="text-center text-danger">Erro de conexão: ${error.message}</p>`;
    }
}

async function deleteGist(gistId, description) {
    if (!confirm(`Tem certeza que deseja excluir "${description}"?`)) return;
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (response.status === 204) {
            showNotification('Gist excluído com sucesso!', 'success');
            loadGistsForDelete();
        } else {
            showNotification(`Erro ao excluir Gist: ${response.status}`, 'error');
        }
    } catch (error) {
        showNotification(`Erro de conexão: ${error.message}`, 'error');
    }
}

async function downloadGist(gist) {
    const gistObj = typeof gist === 'number' ? gistsList[gist] : gist;
    const fileName = Object.keys(gistObj.files)[0] || 'arquivo';
    const rawUrl = gistObj.files[fileName].raw_url;
    try {
        const response = await fetch(rawUrl);
        if (response.status === 200) {
            const content = await response.text();
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification(`Gist "${fileName}" baixado com sucesso!`, 'success');
        } else {
            showNotification(`Erro ao baixar Gist: ${response.status}`, 'error');
        }
    } catch (error) {
        showNotification(`Erro de conexão: ${error.message}`, 'error');
    }
}

async function downloadAllGistsCombined() {
    let combinedContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    for (const gist of gistsList) {
        const fileName = Object.keys(gist.files)[0] || 'arquivo';
        const rawUrl = gist.files[fileName].raw_url;
        try {
            const response = await fetch(rawUrl);
            if (response.status === 200) {
                const content = await response.text();
                combinedContent += `=============================================\n`;
                combinedContent += `Arquivo: ${fileName}\n`;
                combinedContent += `URL: ${gist.html_url}\n`;
                combinedContent += `=============================================\n\n`;
                combinedContent += `${content}\n\n\n`;
            }
        } catch (error) {
            console.error(`Erro ao baixar Gist ${fileName}:`, error);
        }
    }
    if (combinedContent) {
        const blob = new Blob([combinedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gist-backup-${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Backup combinado baixado com sucesso!', 'success');
    } else {
        showNotification('Não foi possível baixar o conteúdo dos Gists', 'error');
    }
}

function showNotification(message, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    notification.className = `notification ${type} show`;
    notification.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    setTimeout(() => { notification.classList.remove('show'); }, 5000);
}

function manageToken() {
    if (githubToken) {
        if (confirm('Um token já está salvo. Deseja removê-lo?')) {
            localStorage.removeItem('githubToken');
            githubToken = '';
            showNotification('Token removido com sucesso!', 'success');
        }
    } else {
        tokenModal.show();
    }
}

window.addEventListener('load', () => {
    if (githubToken) {
        showNotification('Token do GitHub carregado do localStorage', 'success');
    }
});
