// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

        // Add active to clicked
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const content = document.getElementById(tabId);
        content.style.display = 'block';

        // Play sound
        if (window.audioManager) window.audioManager.playClick();
    });
});

// Converter Logic
document.getElementById('conv-file').addEventListener('change', function () {
    if (this.files[0]) document.getElementById('btn-conv-file').textContent = this.files[0].name;
});

document.getElementById('btn-convert').addEventListener('click', async () => {
    const fileInput = document.getElementById('conv-file');
    const file = fileInput.files[0];
    if (!file) return alert("Please select an image first.");

    const format = document.getElementById('conv-format').value;
    const quality = parseFloat(document.getElementById('conv-quality').value);
    const widthInput = document.getElementById('conv-width').value;
    const heightInput = document.getElementById('conv-height').value;

    try {
        const img = await loadImage(file);

        // Calculate new dimensions
        let newW = img.width;
        let newH = img.height;

        if (widthInput && heightInput) {
            newW = parseInt(widthInput);
            newH = parseInt(heightInput);
        } else if (widthInput) {
            newW = parseInt(widthInput);
            newH = Math.round(img.height * (newW / img.width));
        } else if (heightInput) {
            newH = parseInt(heightInput);
            newW = Math.round(img.width * (newH / img.height));
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');

        // Better resizing quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newW, newH);

        // Convert
        const dataUrl = canvas.toDataURL(format, quality);

        // Show Result
        const preview = document.getElementById('conv-preview');
        preview.src = dataUrl;

        const info = document.getElementById('conv-info');
        // Estimate size (base64 length * 0.75)
        const sizeKB = Math.round((dataUrl.length * 0.75) / 1024);
        info.textContent = `Original: ${img.width}x${img.height} | New: ${newW}x${newH} | Est. Size: ${sizeKB} KB`;

        document.getElementById('conv-result-panel').style.display = 'block';

        // Setup Download
        const dlBtn = document.getElementById('btn-conv-download');
        dlBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = dataUrl;
            const ext = format.split('/')[1];
            a.download = `converted.${ext}`;
            a.click();
            if (window.audioManager) window.audioManager.playSuccess();
        };

        if (window.audioManager) window.audioManager.playSuccess();

    } catch (e) {
        console.error(e);
        alert("Error converting image. Double check you're using a .png, .jpg, or .webp file type.");
    }
});
