// Barcode scanner functionality using QuaggaJS
let scanning = false;
let scanAttempts = 0;
let stream = null;

/**
 * Initialize and start the barcode scanner
 * @param {Function} onBarcodeDetected - Callback when barcode is detected
 * @param {Function} onError - Callback for errors
 * @param {Function} debugLog - Debug logging function
 */
async function startScanner(onBarcodeDetected, onError, debugLog) {
    if (typeof Quagga === 'undefined') {
        const error = 'Quagga library not loaded';
        debugLog(`ERROR: ${error}`);
        onError('❌ Barcode scanner library failed to load. Check your internet connection and try again.');
        return;
    }

    try {
        debugLog('Starting barcode scanner...');
        scanAttempts = 0;
        
        const scannerContainer = document.getElementById('scanner-container');
        const result = document.getElementById('result');
        const status = document.getElementById('status');
        const startBtn = document.getElementById('start-btn');
        
        // Hide result if showing
        result.classList.remove('show');
        
        // Clear scanner container and create fresh elements
        scannerContainer.innerHTML = `
            <div id="qr-reader"></div>
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

        debugLog('Initializing Quagga scanner...');
        
        // Initialize Quagga
        Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: document.querySelector('#qr-reader'),
                constraints: {
                    facingMode: 'environment',
                    width: { min: 300, ideal: 640, max: 800 },
                    height: { min: 200, ideal: 300, max: 400 },
                    aspectRatio: { min: 1.0, ideal: 1.33, max: 2.0 }
                },
                area: { // Restrict scan area for better performance
                    top: '20%',
                    right: '10%',
                    left: '10%',
                    bottom: '20%'
                }
            },
            locator: {
                patchSize: 'small', // Optimize for mobile
                halfSample: false
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
                ],
                multiple: false // Prevent multiple simultaneous detections
            },
            locate: true
        }, (err) => {
            if (err) {
                const errorMsg = '❌ Failed to initialize scanner. Try again.';
                debugLog(`Quagga init error: ${err}`);
                console.error(err);
                onError(errorMsg);
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
        
        // Set up barcode detection
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            const format = result.codeResult.format || 'unknown';
            debugLog(`BARCODE FOUND! Value: ${code}, Length: ${code.length}, Format: ${format}`);
            
            // Validate GTIN using API module
            const normalizedFormat = window.BarcodeAPI.formatMap[format] || 'unknown';
            const validation = window.BarcodeAPI.validateGTIN(code, normalizedFormat);
            if (!validation.valid) {
                debugLog(`Invalid GTIN: ${validation.message}`);
                status.textContent = `❌ Invalid barcode: ${validation.message}`;
                return;
            }
            
            onBarcodeDetected(code, format);
        });
        
        // Set up scan progress monitoring
        Quagga.onProcessed((result) => {
            if (scanAttempts % 30 === 0) {
                debugLog('Scanning frame...');
            }
            scanAttempts++;
        });
        
    } catch (err) {
        const errorMsg = '❌ Camera access failed. Ensure camera permissions are enabled in Settings > Safari > Camera, and this app is served over HTTPS.';
        debugLog(`ERROR: ${err.message}`);
        console.error(err);
        onError(errorMsg);
    }
}

/**
 * Stop the barcode scanner and cleanup
 * @param {Function} debugLog - Debug logging function
 */
function stopScanner(debugLog) {
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
    
    const scannerContainer = document.getElementById('scanner-container');
    const status = document.getElementById('status');
    
    // Restore original container content
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

/**
 * Check if scanner is currently active
 * @returns {boolean} - True if scanning is active
 */
function isScanning() {
    return scanning;
}

// Export scanner functions
window.BarcodeScanner = {
    startScanner,
    stopScanner,
    isScanning
};
