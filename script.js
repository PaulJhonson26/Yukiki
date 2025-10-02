const video = document.getElementById('video');
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
        debugLog('Starting scanner...');
        scanAttempts = 0;
        
        // Hide result if showing
        result.classList.remove('show');
        
        debugLog('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        debugLog('Camera access granted');
        video.srcObject = stream;
        await video.play();
        debugLog('Video element started');

        // Initialize JS scanner
        html5QrCodeScanner = new Html5Qrcode("scanner-container");
        
        const config = { 
            fps: 10,  // Scans ~10x/sec for smooth perf on iPhone 8
            qrbox: { width: 250, height: 250 },  // Focus box size
            aspectRatio: 1.0  // Square for barcodes
        };
        
        const successCallback = (decodedText, decodedResult) => {
            debugLog(`BARCODE FOUND! Value: ${decodedText}, Format: ${decodedResult.format?.formatName || 'unknown'}`);
            handleBarcode(decodedText, decodedResult.format?.formatName || 'unknown');
        };
        
        const errorCallback = (error) => {
            if (scanAttempts % 60 === 0) {  // Log errors sparingly
                debugLog(`Scan error: ${error}`);
            }
            scanAttempts++;
        };
        
        // Start scanning
        await html5QrCodeScanner.start(
            { facingMode: "environment" },  // Camera constraints
            config,                         // Config object
            successCallback,               // Success callback
            errorCallback                  // Error callback
        );
        
        scannerContainer.style.display = 'block';
        startBtn.style.display = 'none';
        status.textContent = '📊 Scanning... Point camera at barcode';
        status.style.display = 'block';
        scanning = true;
        debugLog('JS scanner started successfully');
        
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
            html5QrCodeScanner.clear();  // Removes overlay/cache
            debugLog('JS scanner stopped');
            html5QrCodeScanner = null;
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