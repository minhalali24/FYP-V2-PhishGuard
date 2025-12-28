**Developed by Minhal Ali | Final Year Project (FYP)**

This project is developed strictly for academic and educational purposes as part of a Final Year Project (FYP). It is intended for research, learning, and demonstration only.

**What is PhishGuard?**

PhishGuard is a browser extension that uses **Deep Learning (CNN)** to detect phishing websites in real-time. It protects users by analyzing URLs before pages load, blocking malicious sites while allowing legitimate websites to work normally.

## Core Features
###  **Detection**
- Character-level CNN model trained on 686,816 URLs
- 97.12% detection accuracy
- Real-time analysis in under 500ms

###  **Security Indicators**
- SSL/HTTPS connection verification
- Risk level classification (Low, Medium, High, Critical)
- Visual security warnings

###  **User-Friendly Interface**
- Clean, modern design
- Dark mode support
- Instant security status display

###  **Smart Controls**
- Ignored URLs  (trusted sites)
- Continue anyway option for false positives
- One-click "Take me away" safety button

---

## 🌍 How PhishGuard Protects You

In today's digital world, phishing attacks are everywhere:
- 🔗 Malicious links on social media or shared by trustable end user

**PhishGuard stops these threats by:**
1. ✅ Analyzing every URL you visit in real-time
2. ✅ Blocking dangerous sites before they load
3. ✅ Letting you browse legitimate websites without interruption

##  How It Works 

###  **Detecting Phishing Websites**

When you visit a phishing URL, PhishGuard instantly blocks it:


<img width="970" height="505" alt="image" src="https://github.com/user-attachments/assets/29b12e07-1c42-445e-a293-edb6c0d393cb" />

**PhishGuard blocking a phishing website with 100% confidence**

**What you see:**

- warning screen
- Risk Level: CRITICAL
- Phishing Probability: 100.0%
- ⚠️ Security warnings (HTTP connection)
- Two options: "Take me away" or "Continue anyway"

<img width="698" height="884" alt="image" src="https://github.com/user-attachments/assets/5a87d4ff-bfe6-46d2-ab08-eb66405687d3" />

**Extension popup displaying phishing detection details**

**Extension popup shows:**

- "PHISHING DETECTED" status
- URL being analyzed
- Security warnings visible

---

###  **Allowing Legitimate Websites**

When you visit safe websites, PhishGuard lets them load normally:

<img width="1917" height="954" alt="image" src="https://github.com/user-attachments/assets/f722a987-d9fd-4c1d-9096-95dc4ebd453c" />

**PhishGuard confirming a legitimate website is safe**

**What you see:**

- ✅ Green "SAFE" indicator
- "Website appears legitimate"
- Analysis time (e.g., 278ms)
- ✅ Secure HTTPS connection confirmed

---

<img width="1919" height="975" alt="image" src="https://github.com/user-attachments/assets/9d077771-f303-4ebe-9264-7f8b8dc41e70" />

**Normal browsing experience on safe websites**

**Key point:** Legitimate websites work perfectly - no blocking, no delays!

---

## 🔬 Technical Overview

### Detection Flow

User visits URL
↓
Extension intercepts (webNavigation API)
↓
URL → Character tokenization (512 chars)
↓
CNN Model analyzes patterns
↓
CNN Confidence Score [0-1]
↓
SSL/HTTPS Check
↓
Combined Risk Assessment
↓
Decision: Block (>99%) or Allow (≤99%)

### Phishing URL Examples

Phishing URL: www.boat-importers-australia.com.au/wp-includes/css/service.htm

<img width="1916" height="956" alt="image" src="https://github.com/user-attachments/assets/2407d6e7-fe6e-4542-a73f-88ab8ada5fdb" />

Result: ✅ BLOCKED
Confidence: 100.0%
Risk Level: CRITICAL
Time: <300ms
Status: TRUE POSITIVE ✓

**End-User Installation Guide (PhishGuard)**

### For End Users

The following steps explain how end users can install and use the PhishGuard browser extension in Google Chrome.

**Step 1: Download the Extension Files**

1. Visit the GitHub repository: https://github.com/minhalali24/FYP-V2-PhishGuard
2. Click Code and select Download ZIP
3. Extract the downloaded ZIP file to a folder on your computer

<img width="1915" height="960" alt="image" src="https://github.com/user-attachments/assets/d3eff870-70ed-4550-80f7-2201f36117eb" />

**Downloading PhishGuard from GitHub**

**Step 2: Enable Chrome Developer Mode**

1. Open Google Chrome
2. Navigate to chrome://extensions/
3. Enable Developer Mode using the toggle in the top-right corner

<img width="1922" height="980" alt="image" src="https://github.com/user-attachments/assets/c3be1468-267e-4686-9f30-4b1124715e7b" />

**Enabling Developer Mode in Chrome**

**Step 3: Load the Extension**

1. Click Load unpacked
2. Select the extracted PhishGuard extension folder
3. Click Open

<img width="1916" height="931" alt="image" src="https://github.com/user-attachments/assets/47a1646c-e2b1-4cff-b881-3f2eba4db905" />

**Loading the extension**

**Step 4: Verify Installation**

1. The extension appears in chrome://extensions/
2. The PhishGuard icon is visible in the Chrome toolbar
3. The extension is ready for immediate use

<img width="1908" height="958" alt="image" src="https://github.com/user-attachments/assets/74625776-55b7-4e4b-a813-14bf3efbff83" />

**Successfully installed PhishGuard***

---

## ⚙️ Features

### Dark Mode

Click PhishGuard icon → Toggle dark mode for comfortable viewing

<img width="581" height="722" alt="image" src="https://github.com/user-attachments/assets/e050a459-6efe-4102-abc5-d99e48b44e4f" />

**PhishGuard in dark mode**

---

### Ignored URLs Manager

**What are Ignored URLs?**
- Websites you personally trust
- Added when you click "Continue anyway" on warnings
- Useful for false positives

<img width="512" height="632" alt="image" src="https://github.com/user-attachments/assets/c107b318-2806-4947-ac5e-4fa3c5c5cd20" />

**Managing trusted websites**

**To manage:**
1. Click PhishGuard icon
2. Click "Ignored url" button
3. View/remove ignored URLs

**Why would you ignore a URL?**

Sometimes PhishGuard might incorrectly warn you about a safe website (2.88% chance). If this happens:

1. You see the warning
2. You recognize the website is actually safe
3. You click "Continue anyway"
4. That URL gets added to your Ignored URLs list
5. Future visits to that site won't trigger warnings

All detection and processing are performed locally within the browser. No external servers or third-party services are required.

---

**Acknowledgement**

Developed by Minhal Ali Final Year Project (FYP)
