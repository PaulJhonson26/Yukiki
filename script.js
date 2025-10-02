const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
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
let barcodeDetector = null;

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

// Check for Barcode Detection API support
async function initBarcodeDetector() {
    if (barcodeDetector) return true;
    
    debugLog('Checking for Barcode Detection API...');
    
    if (!('BarcodeDetector' in window)) {
        debugLog('BarcodeDetector not available - browser does not support it');
        return false;
    }
    
    try {
        const formats = await BarcodeDetector.getSupportedFormats();
        debugLog(`Supported formats: ${formats.join(', ')}`);
        
        barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        });
        
        debugLog('BarcodeDetector initialized successfully');
        return true;
    } catch (err) {
        debugLog(`ERROR initializing BarcodeDetector: ${err.message}`);
        return false;
    }
}

async function startScanner() {
    try {
        debugLog('Starting scanner...');
        scanAttempts = 0;
        
        // Initialize barcode detector
        const initialized = await initBarcodeDetector();
        if (!initialized) {
            status.textContent = '❌ Barcode detection not supported on this browser. Try using Safari.';
            debugLog('Falling back to manual scanning mode');
            // We'll continue anyway and try manual detection
        }
        
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
        debugLog(`Stream tracks: ${stream.getTracks().length}`);
        
        video.srcObject = stream;
        await video.play();

        debugLog('Video element started');

        scannerContainer.style.display = 'block';
        startBtn.style.display = 'none';
        status.textContent = '📊 Scanning... Point camera at barcode';
        status.style.display = 'block';
        
        scanning = true;
        debugLog('Scan loop starting...');
        requestAnimationFrame(scan);
    } catch (err) {
        status.textContent = '❌ Camera access denied. Please enable camera permissions in Settings.';
        debugLog(`ERROR: ${err.message}`);
        console.error(err);
    }
}

function stopScanner() {
    scanning = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        debugLog('Camera stopped');
    }
    scannerContainer.style.display = 'none';
    status.style.display = 'none';
}

async function scan() {
    if (!scanning) return;

    scanAttempts++;
    
    if (scanAttempts === 1) {
        debugLog('First scan attempt');
    }
    
    // Log every 60 frames (about once per second at 60fps)
    if (scanAttempts % 60 === 0) {
        debugLog(`Scan attempts: ${scanAttempts}, Video ready: ${video.readyState}`);
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        if (scanAttempts === 1) {
            debugLog(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (scanAttempts === 1) {
            debugLog(`Canvas size: ${canvas.width}x${canvas.height}`);
            debugLog(`BarcodeDetector available: ${!!barcodeDetector}`);
        }
        
        if (barcodeDetector) {
            try {
                const barcodes = await barcodeDetector.detect(canvas);

                if (barcodes && barcodes.length > 0) {
                    debugLog(`BARCODE FOUND! Count: ${barcodes.length}`);
                    const barcode = barcodes[0];
                    debugLog(`Type: ${barcode.format}, Value: ${barcode.rawValue}`);
                    handleBarcode(barcode.rawValue, barcode.format);
                    return;
                }
            } catch (err) {
                debugLog(`Detection error: ${err.message}`);
            }
        }
    } else {
        if (scanAttempts <= 10) {
            debugLog(`Waiting for video data... (readyState: ${video.readyState})`);
        }
    }

    requestAnimationFrame(scan);
}

function handleBarcode(data, format) {
    debugLog('Handling barcode result');
    scanning = false;
    stopScanner();
    
    // Display result prominently
    resultContent.textContent = data;
    barcodeType.textContent = `Format: ${format.toUpperCase().replace('_', '-')}`;
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
