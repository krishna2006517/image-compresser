const fileInput = document.getElementById('image-file');
const dropArea = document.getElementById('drop-area');
const fileLabel = document.getElementById('file-label');

const controlsSection = document.getElementById('controls-section');
const resultSection = document.getElementById('result-section');
const statusBox = document.getElementById('status-box');

const presetSelect = document.getElementById('compression-preset');
const sliderGroup = document.getElementById('slider-group');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const formatSelect = document.getElementById('output-format');
const compressBtn = document.getElementById('compress-btn');

const originalPreview = document.getElementById('original-preview');
const compressedPreview = document.getElementById('compressed-preview');
const originalSizeText = document.getElementById('original-size');
const compressedSizeText = document.getElementById('compressed-size');
const savingsPercent = document.getElementById('savings-percent');
const downloadLink = document.getElementById('download-link');

let loadedImage = null;
let originalFile = null;

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.classList.add('dragover');
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

function handleFile(file) {
    if (!file.type.match('image.*')) {
        alert('Please upload a valid image file (JPG, PNG, WebP).');
        return;
    }

    originalFile = file;
    fileLabel.textContent = `Selected: ${file.name}`;
    originalSizeText.textContent = formatBytes(file.size);

    const reader = new FileReader();
    reader.onload = function(e) {
        loadedImage = new Image();
        loadedImage.onload = function() {
            originalPreview.src = e.target.result;
            controlsSection.style.display = 'block';
            resultSection.style.display = 'none';
            statusBox.textContent = 'Image loaded successfully. Choose your settings and click Compress!';
        };
        loadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

presetSelect.addEventListener('change', () => {
    if (presetSelect.value === 'custom') {
        sliderGroup.style.display = 'block';
    } else {
        sliderGroup.style.display = 'none';
    }
});

qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
});

// Advanced Compression Logic
compressBtn.addEventListener('click', () => {
    if (!loadedImage) return;

    statusBox.textContent = 'Compressing image, please wait...';

    setTimeout(() => {
        let quality = 0.6; // High
        let maxDimension = 1920; // Scale HD

        if (presetSelect.value === 'ultra') {
            quality = 0.25; // Extreme compression (e.g. 10MB to ~100KB)
            maxDimension = 1280; 
        } else if (presetSelect.value === 'medium') {
            quality = 0.75;
            maxDimension = 2048;
        } else if (presetSelect.value === 'custom') {
            quality = parseFloat(qualitySlider.value) / 100;
            maxDimension = 2560;
        }

        const canvas = document.createElement('canvas');
        let width = loadedImage.width;
        let height = loadedImage.height;

        // Downscale oversized images proportionally
        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                maxDimension = height;
            }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(loadedImage, 0, 0, width, height);

        const selectedFormat = formatSelect.value;
        const compressedDataUrl = canvas.toDataURL(selectedFormat, quality);

        // Calculate compressed size
        const head = `data:${selectedFormat};base64,`;
        const compressedSizeBytes = Math.round((compressedDataUrl.length - head.length) * 3 / 4);

        compressedPreview.src = compressedDataUrl;
        compressedSizeText.textContent = formatBytes(compressedSizeBytes);

        // Calculate savings percentage
        const savedPercent = Math.round(((originalFile.size - compressedSizeBytes) / originalFile.size) * 100);
        savingsPercent.textContent = `Saved ${savedPercent > 0 ? savedPercent : 0}%`;

        // Update download link
        downloadLink.href = compressedDataUrl;
        const extension = selectedFormat.split('/')[1];
        downloadLink.download = `compressed_${originalFile.name.split('.')[0]}.${extension}`;

        resultSection.style.display = 'block';
        statusBox.textContent = 'Compression complete!';
    }, 100);
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}