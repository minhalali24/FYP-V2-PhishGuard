// PhishGuard AI - Warning Page Handler

console.log('[PhishGuard] Warning page loaded');

// ============================================================================
// SYNC DARK MODE WITH EXTENSION
// ============================================================================

function syncDarkMode() {
    return new Promise((resolve) => {
        if (chrome && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get('darkMode', (result) => {
                const isDarkMode = result.darkMode !== false; // Default to dark mode
                console.log('[PhishGuard] Dark mode from storage:', isDarkMode);
                
                if (isDarkMode) {
                    document.body.classList.add('dark-mode');
                    document.documentElement.style.colorScheme = 'dark';
                } else {
                    document.body.classList.remove('dark-mode');
                    document.documentElement.style.colorScheme = 'light';
                }
                resolve();
            });
        } else {
            // Fallback to system preference
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            console.log('[PhishGuard] Using system dark mode preference:', prefersDarkMode);
            
            if (prefersDarkMode) {
                document.body.classList.add('dark-mode');
                document.documentElement.style.colorScheme = 'dark';
            } else {
                document.body.classList.remove('dark-mode');
                document.documentElement.style.colorScheme = 'light';
            }
            resolve();
        }
    });
}

// ============================================================================
// GET URL PARAMETERS
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

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ============================================================================
// INITIALIZE WARNING PAGE
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[PhishGuard] Initializing warning page');
    
    // DEBUG: Capture ALL clicks on the page
    document.addEventListener('click', function(e) {
        console.log('[PhishGuard] 📍 GLOBAL CLICK DETECTED on:', e.target.id, e.target.className);
    }, true);  // Use capture phase
    
    // Sync dark mode with extension (now async/promise)
    syncDarkMode().then(() => {
        console.log('[PhishGuard] Dark mode applied');
    });
    
    const phishingUrl = getQueryParam('url');
    const decodedUrl = phishingUrl ? decodeURIComponent(phishingUrl) : null;
    const confidence = getQueryParam('confidence');
    
    if (decodedUrl) {
        console.log('[PhishGuard] Phishing URL:', decodedUrl);
    } else {
        console.warn('[PhishGuard] No phishing URL provided in warning page');
    }
    
    if (confidence) {
        // Display the confidence percentage
        const confidenceDisplay = document.getElementById('confidence-display');
        if (confidenceDisplay) {
            const percentageStr = (parseFloat(confidence) * 100).toFixed(1);
            confidenceDisplay.textContent = percentageStr + '%';
            console.log('[PhishGuard] Detection confidence:', percentageStr + '%');
        }
    }
    
    // Setup button listeners with decoded URL
    setupButtons(decodedUrl);
    
    // Prevent history navigation back to phishing site
    window.history.pushState(null, null, window.location.href);
});

// ============================================================================
// BUTTON HANDLERS
// ============================================================================

function setupButtons(phishingUrl) {
    console.log('[PhishGuard] Setting up buttons...');
    console.log('[PhishGuard] phishingUrl:', phishingUrl);
    
    // "Take me to safety" button
    const safeButton = document.getElementById('safe-button');
    if (safeButton) {
        safeButton.addEventListener('click', function(e) {
            console.log('[PhishGuard] Safe button clicked');
            e.preventDefault();
            window.location.href = 'https://www.google.com/';
        });
        console.log('[PhishGuard] Safe button ready');
    }
    
    // "Continue anyway" button - SAME METHOD AS SAFE BUTTON
    const continueButton = document.getElementById('continue-button');
    if (continueButton) {
        continueButton.addEventListener('click', function(e) {
            console.log('[PhishGuard] ✅ CONTINUE BUTTON CLICKED');
            console.log('[PhishGuard] phishingUrl:', phishingUrl);
            
            e.preventDefault();
            
            if (phishingUrl && phishingUrl.trim().length > 0) {
                // Extract domain + path only (no query params)
                const domainAndPath = getDomainAndPath(phishingUrl);
                console.log('[PhishGuard] Ignoring domain+path:', domainAndPath);
                
                // Add domain+path to ignored list to prevent infinite loop
                chrome.storage.local.get(['ignoredUrls'], function(result) {
                    const ignoredUrls = result.ignoredUrls || [];
                    if (!ignoredUrls.includes(domainAndPath)) {
                        ignoredUrls.push(domainAndPath);
                        chrome.storage.local.set({ ignoredUrls: ignoredUrls }, function() {
                            console.log('[PhishGuard] Domain+path added to ignored list:', domainAndPath);
                            // Now redirect to the URL
                            window.location.href = phishingUrl;
                        });
                    } else {
                        console.log('[PhishGuard] Domain+path already in ignored list');
                        window.location.href = phishingUrl;
                    }
                });
            } else {
                console.error('[PhishGuard] No phishingUrl provided');
            }
        });
        console.log('[PhishGuard] Continue button ready');
    } else {
        console.error('[PhishGuard] Continue button not found');
    }
}

// ============================================================================
// HISTORY MANAGEMENT - Prevent going back to phishing
// ============================================================================

// Replace the current history entry to prevent back navigation to phishing
window.addEventListener('load', function() {
    window.history.replaceState(null, null, window.location.href);
});

// If user tries to go back, redirect to safety
window.addEventListener('popstate', function(e) {
    console.log('[PhishGuard] User attempted to go back');
    window.location.href = 'https://www.google.com/';
});

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener('keydown', function(event) {
    // ESC key = Take me to safety (quick escape)
    if (event.key === 'Escape') {
        console.log('[PhishGuard] ESC pressed - redirecting to safety');
        event.preventDefault();
        window.location.href = 'https://www.google.com/';
    }
    
    // ENTER key = Submit (browser default, don't override)
});

// ============================================================================
// ANALYTICS / LOGGING
// ============================================================================

// Log that warning page was displayed
console.log('[PhishGuard] ⚠️ Warning page displayed to user');
console.log('[PhishGuard] User options:');
console.log('  1. Click "Take me to safety" → Google.com');
console.log('  2. Click "Continue anyway" → Original phishing URL');
console.log('  3. Press ESC → Google.com');
console.log('  4. Close tab (safest option)');

// Send warning display event to background
chrome.runtime.sendMessage({
    type: 'PHISHING_WARNING_DISPLAYED',
    timestamp: new Date().toISOString()
}).catch(error => {
    // Background might not be listening, that's okay
    console.log('[PhishGuard] Could not send message to background:', error);
});