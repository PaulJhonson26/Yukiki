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
let scanner = null;

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

// Initialize ZBar scanner
async function initScanner() {
    if (scanner) return true;
    
    try {
        debugLog('Initializing ZBar scanner...');
        const { scanImageData } = await zbarWasm();
        scanner = scanImageData;
        debugLog('ZBar scanner initialized successfully');
        return true;
    } catch (err) {
        debugLog(`ERROR initializing scanner: ${err.message}`);
        return false;
    }
}

async function startScanner() {
    try {
        debugLog('Starting scanner...');
        scanAttempts = 0;
        
        // Initialize scanner
        const initialized = await initScanner();
        if (!initialized) {
            status.textContent = '❌ Scanner failed to initialize. Please refresh the page.';
            return;
        }
        
        // Hide result if showing
        result.classList.remove('show');
        
        debugLog('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        debugLog('Camera access granted');
        debugLog(`Stream tracks: ${stream.getTracks().length}`);
        
        video.srcObject = stream;
        video.play();

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

function scan() {
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
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (scanAttempts === 1) {
            debugLog(`Canvas size: ${canvas.width}x${canvas.height}`);
            debugLog(`ImageData size: ${imageData.width}x${imageData.height}`);
        }
        
        try {
            const symbols = scanner(imageData);

            if (symbols && symbols.length > 0) {
                debugLog(`BARCODE FOUND! Count: ${symbols.length}`);
                const symbol = symbols[0];
                debugLog(`Type: ${symbol.typeName}, Data: ${symbol.decode()}`);
                handleBarcode(symbol.decode(), symbol.typeName);
                return;
            }
        } catch (err) {
            debugLog(`Scanner error: ${err.message}`);
        }
    } else {
        if (scanAttempts <= 10) {
            debugLog(`Waiting for video data... (readyState: ${video.readyState})`);
        }
    }

    requestAnimationFrame(scan);
}

function handleBarcode(data, type) {
    debugLog('Handling barcode result');
    scanning = false;
    stopScanner();
    
    // Display result prominently
    resultContent.textContent = data;
    barcodeType.textContent = `Format: ${type}`;
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
