const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const scannerContainer = document.getElementById('scanner-container');
const result = document.getElementById('result');
const resultContent = document.getElementById('result-content');
const status = document.getElementById('status');

let stream = null;
let scanning = false;
 

startBtn.addEventListener('click', startScanner);
scanAgainBtn.addEventListener('click', startScanner);

async function startScanner() {
    try {
        // Hide result if showing
        result.classList.remove('show');

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        video.srcObject = stream;
        video.play();

        scannerContainer.style.display = 'block';
        startBtn.style.display = 'none';
        status.textContent = '🔍 Scanning... Point camera at QR code';
        status.style.display = 'block';

        scanning = true;
        requestAnimationFrame(scan);
    } catch (err) {
        status.textContent = '❌ Camera access denied. Please enable camera permissions in Settings.';
        console.error(err);
    }
}

function stopScanner() {
    scanning = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    scannerContainer.style.display = 'none';
    status.style.display = 'none';
}

function scan() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            handleQRCode(code.data);
            return;
        }
    }

    requestAnimationFrame(scan);
}

function handleQRCode(data) {
    scanning = false;
    stopScanner();

    // Display result prominently
    resultContent.textContent = data;
    result.classList.add('show');
    startBtn.style.display = 'none';

    // Vibrate if supported
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }

    // Scroll result into view
    setTimeout(() => {
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}


