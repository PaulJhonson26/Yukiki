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

// Format mapping for consistent display
const formatMap = {
    'ean': 'ean_13',
    'ean_8': 'ean_8',
    'upc': 'upc_a',
    'upc_e': 'upc_e',
    'code_128': 'code_128',
    'code_39': 'code_39',
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
    if (typeof Quagga === 'undefined') {
        status.textContent = '❌ Barcode scanner library failed to load. Check your internet connection and try again.';
        debugLog('ERROR: Quagga library not loaded');
        return;
    }

    try {
        debugLog('Starting barcode scanner...');
        scanAttempts = 0;
        
        // Hide result if showing
        result.classList.remove('show');
        
        // Clear scanner container and create fresh elements
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
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        debugLog('Camera access granted');
        video.srcObject = stream;
        
        // Wait for video metadata
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
        
        // Initialize Quagga
        Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: document.querySelector('#qr-reader'),
                constraints: {
                    facingMode: 'environment',
                    width: 640,
                    height: 480
                }
            },
            locator: {
                patchSize: 'medium',
                halfSample: true
            },
            numOfWorkers: 2,
            decoder: {
                readers: [
                    'ean_reader',
                    'ean_8_reader',
                    'upc_reader',
                    'upc_e_reader',
                    'code_128_reader',
                    'code_39_reader'
                ]
            },
            locate: true
        }, (err) => {
            if (err) {
                status.textContent = '❌ Failed to initialize scanner. Try again.';
                debugLog(`Quagga init error: ${err}`);
                console.error(err);
                return;
            }
            
            debugLog('Quagga initialized successfully');
            Quagga.start();
            scannerContainer.style.display = 'block';
            startBtn.style.display = 'none';
            status.textContent = '📊 Scanning... Point camera at barcode';
            status.style.display = 'block';
            scanning = true;
            debugLog('Barcode scanner started successfully');
        });
        
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            const format = result.codeResult.format || 'unknown';
            debugLog(`BARCODE FOUND! Value: ${code}, Format: ${format}`);
            handleBarcode(code, format);
        });
        
        Quagga.onProcessed((result) => {
            if (scanAttempts % 30 === 0) {
                debugLog('Scanning frame...');
            }
            scanAttempts++;
        });
        
    } catch (err) {
        status.textContent = '❌ Camera access failed. Ensure camera permissions are enabled in Settings > Safari > Camera, and this app is served over HTTPS.';
        debugLog(`ERROR: ${err.message}`);
        console.error(err);
    }
}

function stopScanner() {
    scanning = false;
    if (typeof Quagga !== 'undefined') {
        Quagga.stop();
        debugLog('Barcode scanner stopped');
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        debugLog('Camera stopped');
    }
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