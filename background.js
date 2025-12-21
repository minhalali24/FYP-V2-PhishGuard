// PhishGuard AI - Background Service Worker with Real-Time Interception
// Uses chrome.webRequest API for Manifest V3 compatible interception

// Import TensorFlow.js libraries (use relative paths for service worker)
importScripts('lib/tf-core.min.js', 'lib/tf-layers.min.js', 'lib/tf-backend-cpu.min.js');

console.log('[PhishGuard] Background service worker loaded');

let model = null;
let vocab = null;
let initialized = false;
const detectedPhishingUrls = new Map(); // Cache of detected phishing URLs

// ============================================================================
// IGNORED URLS STORAGE MANAGEMENT
// ============================================================================

function getDomainAndPath(url) {
    try {
        const urlObj = new URL(url);
        // Return origin + pathname (no query string or hash)
        return urlObj.origin + urlObj.pathname;
    } catch (error) {
        console.error('[PhishGuard] Invalid URL:', url);
        return url;
    }
}

async function getIgnoredUrls() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ignoredUrls'], function(result) {
            resolve(result.ignoredUrls || []);
        });
    });
}

function isUrlIgnored(url, ignoredUrls) {
    const urlDomainPath = getDomainAndPath(url);
    return ignoredUrls.some(ignoredUrl => {
        const ignoredDomainPath = getDomainAndPath(ignoredUrl);
        return urlDomainPath === ignoredDomainPath;
    });
}

// ============================================================================
// LOAD MODEL AND VOCABULARY
// ============================================================================

async function loadModel() {
    if (model) return true;
    
    try {
        console.log('[PhishGuard] Loading model...');
        
        // Wait for tf to be available
        let attempts = 0;
        while (typeof tf === 'undefined' && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (typeof tf === 'undefined') {
            console.error('[PhishGuard] TensorFlow not available');
            return false;
        }
        
        const modelUrl = chrome.runtime.getURL('models/model.json');
        console.log('[PhishGuard] Model URL:', modelUrl);
        
        model = await tf.loadLayersModel(tf.io.http(modelUrl));
        console.log('[PhishGuard] Model loaded successfully');
        return true;
    } catch (error) {
        console.error('[PhishGuard] Model load error:', error);
        return false;
    }
}

async function loadVocab() {
    if (vocab) return true;
    
    try {
        console.log('[PhishGuard] Loading vocabulary...');
        const vocabUrl = chrome.runtime.getURL('models/vocabulary.json');
        const vocabResponse = await fetch(vocabUrl);
        const vocabData = await vocabResponse.json();
        vocab = vocabData.char_to_idx || vocabData;
        console.log('[PhishGuard] Vocabulary loaded:', Object.keys(vocab).length, 'characters');
        return true;
    } catch (error) {
        console.error('[PhishGuard] Vocab load error:', error);
        return false;
    }
}

// ============================================================================
// URL TO SEQUENCE CONVERSION
// ============================================================================

function urlToSequence(url) {
    if (!vocab) return null;
    
    let sequence = [];
    url = url.toLowerCase();
    
    for (let char of url) {
        sequence.push(char in vocab ? vocab[char] : 0);
    }
    
    // Pad to 512 characters
    while (sequence.length < 512) {
        sequence.push(0);
    }
    
    return sequence.slice(0, 512);
}

// ============================================================================
// PREDICT IF URL IS PHISHING
// ============================================================================

async function predictURL(url) {
    if (!model || !vocab) {
        console.log('[PhishGuard] Model or vocab not loaded');
        return null;
    }
    
    try {
        const sequence = urlToSequence(url);
        if (!sequence) return null;
        
        const inputTensor = tf.tensor2d([sequence], [1, 512], 'int32');
        const outputTensor = model.predict(inputTensor);
        const output = await outputTensor.data();
        const confidence = output[0];
        
        inputTensor.dispose();
        outputTensor.dispose();
        
        return confidence;
    } catch (error) {
        console.error('[PhishGuard] Prediction error:', error);
        return null;
    }
}

// ============================================================================
// INITIALIZE MODEL ON FIRST RUN
// ============================================================================

async function initialize() {
    if (initialized) return true;
    
    console.log('[PhishGuard] First request - initializing...');
    
    const vocabLoaded = await loadVocab();
    if (!vocabLoaded) {
        console.error('[PhishGuard] Failed to load vocabulary');
        return false;
    }
    
    const modelLoaded = await loadModel();
    if (!modelLoaded) {
        console.error('[PhishGuard] Failed to load model');
        return false;
    }
    
    initialized = true;
    console.log('[PhishGuard] ✅ Initialization complete!');
    return true;
}

// ============================================================================
// CHECK URL WITH MODEL
// ============================================================================

async function checkURL(url) {
    // Skip internal URLs
    if (url.startsWith('chrome://') || 
        url.startsWith('about:') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')) {
        return { isPhishing: false };
    }
    
    // Skip if not http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { isPhishing: false };
    }
    
    // Initialize if needed
    if (!initialized) {
        const initSuccess = await initialize();
        if (!initSuccess) {
            return { isPhishing: false };
        }
    }
    
    // Predict
    console.log('[PhishGuard] Checking:', url.substring(0, 60) + '...');
    const confidence = await predictURL(url);
    
    if (confidence === null) {
        console.log('[PhishGuard] Prediction failed');
        return { isPhishing: false };
    }
    
    console.log('[PhishGuard] Confidence:', confidence.toFixed(4), '| Threshold: 0.99');
    
    const isPhishing = confidence > 0.99;
    
    if (isPhishing) {
        console.log('[PhishGuard] 🔴 PHISHING DETECTED');
    } else {
        console.log('[PhishGuard] 🟢 SAFE');
    }
    
    return { 
        isPhishing, 
        confidence,
        url 
    };
}

// ============================================================================
// INTERCEPT NAVIGATION & REDIRECT TO WARNING
// ============================================================================

// Listen for navigation requests
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only check main frame (not iframes)
    if (details.frameId !== 0) return;
    
    const url = details.url;
    const tabId = details.tabId;
    
    console.log('[PhishGuard] Navigation detected:', url);
    
    // Check if URL is in ignored list (user clicked "Continue anyway")
    const ignoredUrls = await getIgnoredUrls();
    if (isUrlIgnored(url, ignoredUrls)) {
        console.log('[PhishGuard] URL is in ignored list, skipping check:', url);
        return;
    }
    
    // Check if URL is phishing
    const result = await checkURL(url);
    
    if (result.isPhishing) {
        console.log('[PhishGuard] Intercepting phishing URL for tab', tabId);
        
        // Store the detected phishing URL
        detectedPhishingUrls.set(tabId, result);
        
        // Redirect to warning page
        const warningUrl = chrome.runtime.getURL(
            'warning.html?url=' + encodeURIComponent(url) + 
            '&confidence=' + encodeURIComponent(result.confidence.toFixed(4))
        );
        
        console.log('[PhishGuard] Redirecting to warning page:', warningUrl);
        
        // Check if tab was coming from another phishing warning to avoid loops
        
        chrome.tabs.update(tabId, { url: warningUrl });
    }
}, {
    url: [
        { schemes: ['http', 'https'] }
    ]
});

// ============================================================================
// LISTEN FOR TAB UPDATES (for popup detection)
// ============================================================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // This is just for logging - real interception happens in onBeforeNavigate
        console.log('[PhishGuard] Tab update - URL:', tab.url);
    }
});

// ============================================================================
// CLEANUP: Remove from cache when tab closes
// ============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
    detectedPhishingUrls.delete(tabId);
});

// ============================================================================
// SERVICE WORKER KEEP-ALIVE (for Manifest V3)
// ============================================================================

// The service worker may be suspended, so we need to keep it alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        console.log('[PhishGuard] Service worker keep-alive ping');
    }
});

// ============================================================================
// STARTUP
// ============================================================================

console.log('[PhishGuard] Background service worker ready');
console.log('[PhishGuard] Using webNavigation API for real-time interception');
console.log('[PhishGuard] Monitoring navigation for phishing URLs...');

chrome.runtime.onInstalled.addListener(() => {
    console.log('[PhishGuard] Extension installed successfully');
});