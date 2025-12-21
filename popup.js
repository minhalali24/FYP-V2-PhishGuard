// PhishGuard AI - DIRECT MODEL LOADING (2 STATES ONLY)

console.log('[PhishGuard] Popup script loaded');
console.log('[PhishGuard] tf available:', typeof tf);
console.log('[PhishGuard] tf.lite available:', typeof tf?.lite);

let model = null;
let vocab = null;

const loadingState = document.getElementById('loading-state');
const safeState = document.getElementById('safe-state');
const dangerousState = document.getElementById('dangerous-state');
const closeBtn = document.getElementById('close-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const ignoredItemsBtn = document.getElementById('ignored-items-btn');
const ignoredUrlsModal = document.getElementById('ignored-urls-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const ignoredUrlsList = document.getElementById('ignored-urls-list');
const noIgnoredUrls = document.getElementById('no-ignored-urls');
const clearAllBtn = document.getElementById('clear-all-btn');

function hideAllStates() {
    loadingState.style.display = 'none';
    safeState.style.display = 'none';
    dangerousState.style.display = 'none';
}

function resetMoreInfo(stateEl) {
    const infoPanel = stateEl.querySelector('.more-info');
    const infoToggle = stateEl.querySelector('.info-toggle');
    if (infoPanel) {
        infoPanel.style.display = 'none';
    }
    if (infoToggle) {
        infoToggle.textContent = 'More info';
    }
}

function showLoading() {
    hideAllStates();
    loadingState.style.display = 'block';
}

function showSafeState(url, confidence, time) {
    hideAllStates();
    safeState.style.display = 'block';
    document.getElementById('url-safe').textContent = url.length > 35 ? url.substring(0, 35) + '...' : url;
    document.getElementById('confidence-safe').textContent = (confidence * 100).toFixed(2) + '%';
    document.getElementById('time-safe').textContent = time + 'ms';
    resetMoreInfo(safeState);
}

function showDangerousState(url, confidence) {
    hideAllStates();
    dangerousState.style.display = 'block';
    document.getElementById('url-dangerous').textContent = url.length > 35 ? url.substring(0, 35) + '...' : url;
    document.getElementById('confidence-dangerous').textContent = (confidence * 100).toFixed(2) + '%';
    resetMoreInfo(dangerousState);
}

function urlToSequence(url) {
    if (!vocab) return null;
    
    let sequence = [];
    url = url.toLowerCase();
    
    for (let char of url) {
        sequence.push(char in vocab ? vocab[char] : 0);
    }
    
    while (sequence.length < 512) {
        sequence.push(0);
    }
    
    return sequence.slice(0, 512);
}

async function predictURL(url) {
    if (!model || !vocab) return null;
    
    try {
        const sequence = urlToSequence(url);
        if (!sequence) return null;
        
        // Create input tensor for model — use integer indices for Embedding
        const inputTensor = tf.tensor2d([sequence], [1, 512], 'int32');
        
        // Run inference
        const outputTensor = model.predict(inputTensor);
        
        // Get the prediction value
        const output = await outputTensor.data();
        const confidence = output[0];
        
        // Cleanup tensors
        inputTensor.dispose();
        outputTensor.dispose();
        
        return confidence;
    } catch (error) {
        console.error('[PhishGuard] Prediction error:', error);
        return null;
    }
}

async function loadModelFromJSON() {
    try {
        console.log('[PhishGuard] Loading model from JSON...');
        
        const modelUrl = chrome.runtime.getURL('models/model.json');
        console.log('[PhishGuard] Model URL:', modelUrl);
        
        // Load using TensorFlow.js loadLayersModel
        model = await tf.loadLayersModel(tf.io.http(modelUrl));
        
        console.log('[PhishGuard] Model loaded successfully');
        return true;
    } catch (error) {
        console.error('[PhishGuard] Model load error:', error);
        console.error('[PhishGuard] Error details:', error.message);
        return false;
    }
}

async function loadVocab() {
    try {
        const vocabUrl = chrome.runtime.getURL('models/vocabulary.json');
        const vocabResponse = await fetch(vocabUrl);
        const vocabData = await vocabResponse.json();
        vocab = vocabData.char_to_idx || vocabData;
        console.log('[PhishGuard] Vocabulary loaded:', Object.keys(vocab).length, 'entries');
        return true;
    } catch (error) {
        console.error('[PhishGuard] Vocab load error:', error);
        return false;
    }
}

async function checkCurrentURL() {
    showLoading();
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let urlToCheck = tab.url;
        
        // If on warning page, extract the phishing URL from query params
        if (tab.url.includes('warning.html')) {
            const warningUrl = new URL(tab.url);
            const phishingUrl = warningUrl.searchParams.get('url');
            if (phishingUrl) {
                urlToCheck = decodeURIComponent(phishingUrl);
                console.log('[PhishGuard] Warning page detected, checking phishing URL:', urlToCheck);
            }
        }
        
        const fullUrl = urlToCheck;
        document.getElementById('current-url-loading').textContent = fullUrl.length > 50 ? fullUrl.substring(0, 50) + '...' : fullUrl;
        
        // Wait for TensorFlow
        console.log('[PhishGuard] Waiting for TensorFlow...');
        for (let i = 0; i < 30; i++) {
            if (typeof tf !== 'undefined') {
                console.log('[PhishGuard] TensorFlow ready');
                break;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        
        if (typeof tf === 'undefined') {
            hideAllStates();
            alert('ERROR: TensorFlow.js not loaded');
            return;
        }
        
        // Load model and vocab
        if (!model) {
            console.log('[PhishGuard] Loading model...');
            const modelLoaded = await loadModelFromJSON();
            if (!modelLoaded) {
                hideAllStates();
                alert('ERROR: Could not load model');
                return;
            }
        }
        
        if (!vocab) {
            console.log('[PhishGuard] Loading vocabulary...');
            const vocabLoaded = await loadVocab();
            if (!vocabLoaded) {
                hideAllStates();
                alert('ERROR: Could not load vocabulary');
                return;
            }
        }
        
        // Predict
        console.log('[PhishGuard] Making prediction for:', fullUrl);
        const startTime = performance.now();
        const confidence = await predictURL(fullUrl);
        const endTime = performance.now();
        const time = Math.round(endTime - startTime);
        
        if (confidence === null) {
            hideAllStates();
            alert('ERROR: Prediction failed');
            return;
        }
        
        console.log('[PhishGuard] Confidence:', confidence);
        console.log('[PhishGuard] Threshold: 0.99');
        
        // ========== 2 STATES ONLY ==========
        // SAFE if confidence <= 0.99
        // PHISHING if confidence > 0.99
        
        if (confidence > 0.99) {
            console.log('[PhishGuard] RESULT: 🔴 PHISHING DETECTED (confidence ' + confidence.toFixed(4) + ' > 0.99)');
            showDangerousState(fullUrl, confidence);
        } else {
            console.log('[PhishGuard] RESULT: 🟢 SAFE (confidence ' + confidence.toFixed(4) + ' ≤ 0.99)');
            showSafeState(fullUrl, 1 - confidence, time);
        }
        
    } catch (error) {
        console.error('[PhishGuard] Error:', error);
        hideAllStates();
        alert('ERROR: ' + error.message);
    }
}

function closePopup() {
    window.close();
}

function initializeDarkMode() {
    const hasChromeSync = typeof chrome !== 'undefined' && chrome.storage?.sync;
    if (hasChromeSync) {
        chrome.storage.sync.get('darkMode', (result) => {
            const isDarkMode = result?.darkMode || false;
            darkModeToggle.checked = isDarkMode;
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            }
        });
    } else {
        // Fallback to localStorage
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = isDarkMode;
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }
}

function initializeInfoToggles() {
    document.querySelectorAll('.state').forEach((state) => {
        const panel = state.querySelector('.more-info');
        const toggle = state.querySelector('.info-toggle');
        if (panel && toggle) {
            panel.style.display = 'none';
            toggle.textContent = 'More info';
            toggle.addEventListener('click', () => {
                const isHidden = panel.style.display === 'none';
                panel.style.display = isHidden ? 'block' : 'none';
                toggle.textContent = isHidden ? 'Less info' : 'More info';
            });
        }
    });
}

darkModeToggle.addEventListener('change', () => {
    const isDarkMode = darkModeToggle.checked;
    
    const hasChromeSync = typeof chrome !== 'undefined' && chrome.storage?.sync;
    if (hasChromeSync) {
        chrome.storage.sync.set({ darkMode: isDarkMode });
    } else {
        // Fallback to localStorage
        localStorage.setItem('darkMode', isDarkMode);
    }
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
});

closeBtn.addEventListener('click', closePopup);

// Take me away button for phishing detection
const takeMeAwayBtn = document.getElementById('take-me-away-btn');
if (takeMeAwayBtn) {
    takeMeAwayBtn.addEventListener('click', () => {
        console.log('[PhishGuard] Take me away clicked');
        chrome.tabs.update({ url: 'https://www.google.com/' });
    });
}

// ============================================================================
// IGNORED URLS MANAGER
// ============================================================================

async function loadIgnoredUrls() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ignoredUrls'], (result) => {
            resolve(result.ignoredUrls || []);
        });
    });
}

async function saveIgnoredUrls(urls) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ ignoredUrls: urls }, () => {
            resolve();
        });
    });
}

async function displayIgnoredUrls() {
    const ignoredUrls = await loadIgnoredUrls();
    
    ignoredUrlsList.innerHTML = '';
    
    if (ignoredUrls.length === 0) {
        noIgnoredUrls.style.display = 'block';
        ignoredUrlsList.style.display = 'none';
    } else {
        noIgnoredUrls.style.display = 'none';
        ignoredUrlsList.style.display = 'flex';
        
        ignoredUrls.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'ignored-url-item';
            
            const urlText = document.createElement('span');
            urlText.className = 'ignored-url-text';
            urlText.textContent = url;
            urlText.title = url;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-url-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => removeIgnoredUrl(index);
            
            item.appendChild(urlText);
            item.appendChild(removeBtn);
            ignoredUrlsList.appendChild(item);
        });
    }
}

async function removeIgnoredUrl(index) {
    const ignoredUrls = await loadIgnoredUrls();
    ignoredUrls.splice(index, 1);
    await saveIgnoredUrls(ignoredUrls);
    await displayIgnoredUrls();
    console.log('[PhishGuard] Removed ignored URL at index', index);
}

async function clearAllIgnoredUrls() {
    if (confirm('Remove all ignored URLs?')) {
        await saveIgnoredUrls([]);
        await displayIgnoredUrls();
        console.log('[PhishGuard] Cleared all ignored URLs');
    }
}

// Open modal
ignoredItemsBtn.addEventListener('click', async () => {
    await displayIgnoredUrls();
    ignoredUrlsModal.style.display = 'flex';
});

// Close modal
modalCloseBtn.addEventListener('click', () => {
    ignoredUrlsModal.style.display = 'none';
});

// Close modal when clicking outside
ignoredUrlsModal.addEventListener('click', (e) => {
    if (e.target === ignoredUrlsModal) {
        ignoredUrlsModal.style.display = 'none';
    }
});

// Clear all button
clearAllBtn.addEventListener('click', clearAllIgnoredUrls);

document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    initializeInfoToggles();
    setTimeout(() => {
        checkCurrentURL();
    }, 2000);
});