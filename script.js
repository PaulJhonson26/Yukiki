const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const scannerContainer = document.getElementById('scanner-container');
const result = document.getElementById('result');
const resultContent = document.getElementById('result-content');
const status = document.getElementById('status');
const debugConsole = document.getElementById('debug-console');
const toggleDebugBtn = document.getElementById('toggle-debug');
const codeReader = new ZXing.BrowserMultiFormatReader();

let stream = null;
let scanning = false;
let debugEnabled = false;
let scanAttempts = 0;

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

function waitForJsQR() {
    return new Promise((resolve, reject) => {
        if (typeof jsQR !== 'undefined') {
            resolve();
            return;
        }

        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof jsQR !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts > 50) {
                clearInterval(checkInterval);
                reject(new Error('jsQR library failed to load'));
            }
        }, 100);
    });
}

startBtn.addEventListener('click', startScanner);
scanAgainBtn.addEventListener('click', startScanner);

async function startScanner() {
    try {
        debugLog('Starting scanner...');
        scanAttempts = 0;

        debugLog('Checking for jsQR library...');
        try {
            await waitForJsQR();
            debugLog('jsQR library loaded successfully!');
        } catch (err) {
            debugLog('ERROR: jsQR library failed to load');
            status.textContent = '❌ QR library failed to load. Please refresh the page.';
            return;
        }

        result.classList.remove('show');

        debugLog('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        debugLog('Camera access granted');
        debugLog(`Stream tracks: ${stream.getTracks().length}`);

        video.srcObject = stream;
        video.play();

        debugLog('Video element started');

        scannerContainer.style.display = 'block';
        startBtn.style.display = 'none';
        status.textContent = '🔍 Scanning... Point camera at QR code';
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
            debugLog('jsQR library loaded: ' + (typeof jsQR !== 'undefined'));
        }
        try {
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
            const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
            const resultZXing = codeReader.decode(binaryBitmap);
            if (resultZXing) {
                debugLog('BARCODE FOUND!');
                debugLog(`Data: ${resultZXing.getText()}`);
                handleScannedCode(resultZXing.getText());
                return;
            }
        } catch (err) {
            debugLog('No barcode detected this frame');
        }

        try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert"
            });

            if (code) {
                debugLog('QR CODE FOUND!');
                debugLog(`Data: ${code.data}`);
                handleScannedCode(code.data);
                return;
            }
        } catch (err) {
            debugLog(`jsQR error: ${err.message}`);
        }
    } else {
        if (scanAttempts <= 10) {
            debugLog(`Waiting for video data... (readyState: ${video.readyState})`);
        }
    }

    requestAnimationFrame(scan);
}

function handleScannedCode(data) {
    debugLog('Handling QR code result');
    scanning = false;
    stopScanner();

    resultContent.textContent = data;
    result.classList.add('show');
    startBtn.style.display = 'none';

    debugLog('Result displayed');

    if ('vibrate' in navigator) {
        navigator.vibrate(200);
        debugLog('Vibration triggered');
    }

    setTimeout(() => {
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}


