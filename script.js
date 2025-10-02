const startBtn = document.getElementById('start-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const scannerContainer = document.getElementById('scanner-container');
const result = document.getElementById('result');
const resultContent = document.getElementById('result-content');
const barcodeType = document.getElementById('barcode-type');
const status = document.getElementById('status');
const debugConsole = document.getElementById('debug-console');
const toggleDebugBtn = document.getElementById('toggle-debug');

let stream = null;
let scanning = false;
let debugEnabled = false;
let scanAttempts = 0;
let html5QrCodeScanner = null;

// Format mapping for consistent display
const formatMap = {
    'EAN_13': 'ean_13',
    'EAN_8': 'ean_8',
    'UPC_A': 'upc_a',
    'UPC_E': 'upc_e',
    'CODE_128': 'code_128',
    'CODE_39': 'code_39',
    'unknown': 'unknown'
};

// Debug logging function
function debugLog(message) {
    const line = document.createElement('div');
    line.className = 'debug-line';
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;
    debugConsole.appendChild(line);
    debugConsole.scrollTop = debugConsole.scrollHeight;
    console.log(message);
}

toggleDebugBtn.addEventListener('click', () => {
    debugEnabled = !debugEnabled;
    if (debugEnabled) {
        debugConsole.classList.add('show');
        toggleDebugBtn.textContent = 'Hide Debug Info';
        debugLog('Debug mode enabled');
    } else {
        debugConsole.classList.remove('show');
        toggleDebugBtn.textContent = 'Show Debug Info';
    }
});

startBtn.addEventListener('click', startScanner);
scanAgainBtn.addEventListener('click', startScanner);

async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        status.textContent = '❌ Barcode scanner library failed to load. Check your internet connection and try again.';
        debugLog('ERROR: Html5Qrcode library not loaded');
        return;
    }

    try {
        debugLog('Starting barcode scanner...');
        scanAttempts = 0;
        
        // Hide result if showing
        result.classList.remove('show');
        
        // Clear scanner container and create fresh video and reader elements
        scannerContainer.innerHTML = `
            <div id="qr-reader" style="width: 100%;"></div>
            <video id="video" playsinline style="display: none;"></video>
            <div id="overlay">
                <div class="scanner-frame">
                    <div class="scan-line"></div>
                    <div class="corner top-left"></div>
                    <div class="corner top-right"></div>
                    <div class="corner bottom-left"></div>
                    <div class="corner bottom-right"></div>
                </div>
            </div>
        `;

        const video = document.getElementById('video');
        
        debugLog('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 640 }, // Stable resolution for iPhone 8
                height: { ideal: 480 }
            }
        });
        
        debugLog('Camera access granted');
        video.srcObject = stream;
        
        // Wait for video metadata to ensure valid dimensions
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                debugLog(`Video metadata loaded. Dimensions: ${video.videoWidth}x${video.videoHeight}`);
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    reject(new Error('Invalid video dimensions'));
                } else {
                    resolve();
                }
            };
            video.onerror = () => reject(new Error('Video stream error'));
            video.play();
        });
        
        // Initialize scanner with barcode-only formats
        html5QrCodeScanner = new Html5Qrcode("qr-reader", {
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39
            ]
        });
        
        // Dynamic qrbox size to prevent IndexSizeError
        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 480;
        const qrboxWidth = Math.min(300, videoWidth * 0.8); // 80% of video width
        const qrboxHeight = Math.min(100, videoHeight * 0.3); // Narrower for barcodes
        
        const config = { 
            fps: 10,  // Balanced for iPhone 8
            qrbox: { width: qrboxWidth, height: qrboxHeight },
            aspectRatio: 3.0, // Wider for linear barcodes
            disableFlip: true // Prevent flipping
        };
        
        debugLog(`Scanner config: qrbox ${qrboxWidth}x${qrboxHeight}, aspectRatio ${config.aspectRatio}`);
        
        const successCallback = (decodedText, decodedResult) => {
            debugLog(`BARCODE FOUND! Value: ${decodedText}, Format: ${decodedResult.format?.formatName || 'unknown'}`);
            handleBarcode(decodedText, decodedResult.format?.formatName || 'unknown');
        };
        
        const errorCallback = (error) => {
            if (scanAttempts % 60 === 0) {
                debugLog(`Scan error: ${error}`);
            }
            scanAttempts++;
        };
        
        // Start scanning
        await html5QrCodeScanner.start(
            { facingMode: "environment" },
            config,
            successCallback,
            errorCallback
        );
        
        scannerContainer.style.display = 'block';
        startBtn.style.display = 'none';
        status.textContent = '📊 Scanning... Point camera at barcode';
        status.style.display = 'block';
        scanning = true;
        debugLog('Barcode scanner started successfully');
        
    } catch (err) {
        status.textContent = '❌ Camera access failed. Ensure camera permissions are enabled in Settings > Safari > Camera, and this app is served over HTTPS.';
        debugLog(`ERROR: ${err.message}`);
        console.error(err);
    }
}

function stopScanner() {
    scanning = false;
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            html5QrCodeScanner.clear();
            debugLog('Barcode scanner stopped');
            html5QrCodeScanner = null;
            
            // Restore original scanner container content
            scannerContainer.innerHTML = `
                <video id="video" playsinline style="display: none;"></video>
                <div id="overlay">
                    <div class="scanner-frame">
                        <div class="scan-line"></div>
                        <div class="corner top-left"></div>
                        <div class="corner top-right"></div>
                        <div class="corner bottom-left"></div>
                        <div class="corner bottom-right"></div>
                    </div>
                </div>
            `;
        }).catch(err => debugLog(`Stop error: ${err}`));
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        debugLog('Camera stopped');
    }
    scannerContainer.style.display = 'none';
    status.style.display = 'none';
}

function handleBarcode(data, format) {
    debugLog('Handling barcode result');
    scanning = false;
    stopScanner();
    
    // Display result prominently
    const normalizedFormat = formatMap[format] || 'unknown';
    resultContent.textContent = data;
    barcodeType.textContent = `Format: ${normalizedFormat.toUpperCase().replace('_', '-')}`;
    result.classList.add('show');
    startBtn.style.display = 'none';
    
    debugLog('Result displayed');
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
        debugLog('Vibration triggered');
    }

    // Scroll result into view
    setTimeout(() => {
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}