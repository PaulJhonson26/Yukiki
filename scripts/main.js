// Main application initialization and coordination
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Yukiki app...');
});

// DOM element references
const startBtn = document.getElementById('start-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const result = document.getElementById('result');
const resultContent = document.getElementById('result-content');
const barcodeType = document.getElementById('barcode-type');
const status = document.getElementById('status');
const debugConsole = document.getElementById('debug-console');
const toggleDebugBtn = document.getElementById('toggle-debug');

// Application state
let debugEnabled = false;

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

// Debug: Check if elements exist
console.log('Elements found:', {
    startBtn: !!startBtn,
    scanAgainBtn: !!scanAgainBtn,
    toggleDebugBtn: !!toggleDebugBtn,
    status: !!status,
    debugConsole: !!debugConsole
});

// Debug toggle functionality
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

// Handle barcode detection result
async function handleBarcodeDetected(data, format) {
    debugLog('Handling barcode result');
    
    // Display raw GTIN with loading state
    const normalizedFormat = window.BarcodeAPI.formatMap[format] || 'unknown';
    resultContent.textContent = `${data} (Looking up product...)`;
    barcodeType.textContent = `Format: ${normalizedFormat.toUpperCase().replace('_', '-')}`;
    result.classList.add('show');
    startBtn.style.display = 'none';
    
    // Clear previous images if any
    const existingImg = result.querySelector('img');
    if (existingImg) existingImg.remove();
    
    // API lookup
    debugLog(`Looking up product for barcode: ${data}`);
    const lookupResult = await window.BarcodeAPI.lookupProduct(data);
    
    if (lookupResult.success) {
        const product = lookupResult.product;
        resultContent.textContent = `${data} - ${product.title}`;
        
        // Update barcodeType with brand if available
        barcodeType.textContent = `Format: ${normalizedFormat.toUpperCase().replace('_', '-')}`;
        if (product.brand) {
            barcodeType.textContent += ` | Brand: ${product.brand}`;
        }
        
        // Display first image if available
        if (product.images && product.images.length > 0) {
            const img = document.createElement('img');
            img.src = product.images[0];
            img.style.maxWidth = '200px';
            img.style.marginTop = '10px';
            img.alt = product.title;
            result.appendChild(img);
            debugLog('Product image displayed');
        }
        
        debugLog('Product lookup successful');
    } else {
        resultContent.textContent = `${data} (${lookupResult.message})`;
        debugLog(`Product lookup failed: ${lookupResult.message}`);
    }
    
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

// Handle scanner errors
function handleScannerError(errorMessage) {
    status.textContent = errorMessage;
    debugLog(`Scanner error: ${errorMessage}`);
}

// Start scanning function
async function startScanning() {
    debugLog('Start scanning requested');
    await window.BarcodeScanner.startScanner(
        handleBarcodeDetected,
        handleScannerError,
        debugLog
    );
}

// Stop scanning function
function stopScanning() {
    debugLog('Stop scanning requested');
    window.BarcodeScanner.stopScanner(debugLog);
}

// Event listeners for scanner buttons
startBtn.addEventListener('click', startScanning);
scanAgainBtn.addEventListener('click', startScanning);

// Initialize app
debugLog('Yukiki app initialized successfully');
