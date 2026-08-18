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
const downloadFormatSelect = document.getElementById('download-format-select');
const compressBtn = document.getElementById('compress-btn');

const originalPreview = document.getElementById('original-preview');
const compressedPreview = document.getElementById('compressed-preview');
const originalSizeText = document.getElementById('original-size');
const compressedSizeText = document.getElementById('compressed-size');
const savingsPercent = document.getElementById('savings-percent');
const executeDownloadBtn = document.getElementById('execute-download-btn');

let loadedImage = null;
let originalFile = null;
let currentCanvas = null;
let currentQuality = 0.6;

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => { dropArea.classList.add('dragover'); });
['dragleave', 'drop'].forEach(eventName => { dropArea.classList.remove('dragover'); });

dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) handleFile(dt.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

function handleFile(file) {
    if (!file.type.match('image.*')) {
        alert('Please upload a valid image file (PNG, JPG, WebP).');
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
            statusBox.textContent = 'Image loaded! Select output format and click Compress.';
        };
        loadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

presetSelect.addEventListener('change', () => {
    sliderGroup.style.display = (presetSelect.value === 'custom') ? 'block' : 'none';
});

qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
});

// Compression Handler
compressBtn.addEventListener('click', () => {
    if (!loadedImage) return;

    statusBox.textContent = 'Compressing image...';

    setTimeout(() => {
        let maxDimension = 1920;
        currentQuality = 0.6;

        if (presetSelect.value === 'ultra') {
            currentQuality = 0.25; // Max reduction (10MB to ~100KB)
            maxDimension = 1280;
        } else if (presetSelect.value === 'medium') {
            currentQuality = 0.75;
            maxDimension = 2048;
        } else if (presetSelect.value === 'custom') {
            currentQuality = parseFloat(qualitySlider.value) / 100;
            maxDimension = 2560;
        }

        const canvas = document.createElement('canvas');
        let width = loadedImage.width;
        let height = loadedImage.height;

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
        currentCanvas = canvas;

        // Preview in WebP for fast display
        const previewUrl = canvas.toDataURL('image/webp', currentQuality);
        const head = `data:image/webp;base64,`;
        const compressedSizeBytes = Math.round((previewUrl.length - head.length) * 3 / 4);

        compressedPreview.src = previewUrl;
        compressedSizeText.textContent = formatBytes(compressedSizeBytes);

        const savedPercent = Math.round(((originalFile.size - compressedSizeBytes) / originalFile.size) * 100);
        savingsPercent.textContent = `Saved ${savedPercent > 0 ? savedPercent : 0}%`;

        resultSection.style.display = 'block';
        statusBox.textContent = 'Compression complete! Click Download below.';
    }, 100);
});

// Dropdown-based Universal Download Engine
executeDownloadBtn.addEventListener('click', () => {
    if (!currentCanvas) return;

    const selectedFormat = downloadFormatSelect.value;
    const baseFileName = originalFile.name.split('.')[0];

    if (selectedFormat === 'pdf') {
        // Export to PDF Document
        const { jsPDF } = window.jspdf;
        const imgData = currentCanvas.toDataURL('image/jpeg', currentQuality);
        const pdf = new jsPDF({
            orientation: currentCanvas.width > currentCanvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [currentCanvas.width, currentCanvas.height]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, currentCanvas.width, currentCanvas.height);
        pdf.save(`compressed_${baseFileName}.pdf`);

    } else if (selectedFormat === 'base64') {
        // Export as Base64 Text File
        const dataUrl = currentCanvas.toDataURL('image/webp', currentQuality);
        downloadTextFile(`compressed_${baseFileName}_base64.txt`, dataUrl);

    } else if (selectedFormat === 'html') {
        // Export as HTML Img Tag Text File
        const dataUrl = currentCanvas.toDataURL('image/webp', currentQuality);
        const htmlContent = `<img src="${dataUrl}" alt="Compressed Image" />`;
        downloadTextFile(`compressed_${baseFileName}_tag.html`, htmlContent);

    } else {
        // Export Image Formats (PNG, JPG, WebP)
        let mimeType = 'image/webp';
        if (selectedFormat === 'png') mimeType = 'image/png';
        if (selectedFormat === 'jpg') mimeType = 'image/jpeg';

        const dataUrl = currentCanvas.toDataURL(mimeType, currentQuality);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `compressed_${baseFileName}.${selectedFormat}`;
        link.click();
    }
});

function downloadTextFile(filename, textContent) {
    const blob = new Blob([textContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
