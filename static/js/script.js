// static/js/script.js

// DOM Element References
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const previewCard = document.getElementById("preview-card");
const imagePreview = document.getElementById("image-preview");
const fileName = document.getElementById("file-name");
const predictBtn = document.getElementById("predict-btn");
const clearBtn = document.getElementById("clear-image");

const errorBanner = document.getElementById("error-banner");
const errorMessage = document.getElementById("error-message");

const loadingState = document.getElementById("loading-state");
const resultsSection = document.getElementById("results-section");

let selectedFile = null;
let latestScanData = null;

// -------------------------
// Auth Session Checker
// -------------------------
function checkAuthSession() {
    fetch('/api/auth/user')
        .then(res => res.json())
        .then(data => {
            const authBox = document.getElementById('auth-buttons');
            if (authBox && data.logged_in && data.user) {
                const isAdmin = data.user.email && data.user.email.toLowerCase() === 'admin123@gmail.com';
                const adminBtn = isAdmin ? `<a href="/admin" class="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-amber-600 hover:text-white transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-xs">admin_panel_settings</span> Admin Panel</a>` : '';

                authBox.innerHTML = `
                    <div class="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full text-xs font-bold border border-outline-variant">
                        <span class="material-symbols-outlined text-secondary text-sm">account_circle</span>
                        <span class="text-primary">${data.user.name || data.user.email}</span>
                        ${adminBtn}
                        <a href="/logout" class="text-error hover:underline ml-1 font-semibold">Logout</a>
                    </div>
                `;
            }
        })
        .catch(() => { });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthSession);
} else {
    checkAuthSession();
}

// -------------------------
// Error Messaging
// -------------------------
function hideError() {
    if (errorBanner) {
        errorBanner.classList.add("hidden");
    }
}

function showError(msg) {
    if (errorMessage) {
        errorMessage.innerText = msg;
    }
    if (errorBanner) {
        errorBanner.classList.remove("hidden");
    }
}

// -------------------------
// Image Preview Handling
// -------------------------
if (fileInput) {
    fileInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        // Client-side image validation
        const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        const isTypeValid = validTypes.includes(file.type.toLowerCase()) || file.name.match(/\.(png|jpe?g|webp)$/i);
        
        if (!isTypeValid) {
            showError("Invalid image format. Please upload a PNG, JPG, JPEG, or WEBP file.");
            fileInput.value = "";
            selectedFile = null;
            return;
        }

        selectedFile = file;
        hideError();

        const reader = new FileReader();
        reader.onload = function (e) {
            if (imagePreview) imagePreview.src = e.target.result;
            if (fileName) fileName.innerText = selectedFile.name;
            if (dropZone) dropZone.classList.add("hidden");
            if (previewCard) previewCard.classList.remove("hidden");
            if (resultsSection) resultsSection.classList.add("hidden");
        };
        reader.readAsDataURL(selectedFile);
    });
}

// -------------------------
// Clear Image Selection
// -------------------------
if (clearBtn) {
    clearBtn.addEventListener("click", function () {
        if (fileInput) fileInput.value = "";
        selectedFile = null;
        if (imagePreview) imagePreview.src = "";
        hideError();
        if (previewCard) previewCard.classList.add("hidden");
        if (resultsSection) resultsSection.classList.add("hidden");
        if (dropZone) dropZone.classList.remove("hidden");
    });
}

// -------------------------
// Drag & Drop Functionality
// -------------------------
if (dropZone) {
    dropZone.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("border-secondary", "bg-surface-container-high");
    });

    dropZone.addEventListener("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("border-secondary", "bg-surface-container-high");
    });

    dropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("border-secondary", "bg-surface-container-high");

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (fileInput) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event("change"));
            }
        }
    });
}

// -------------------------
// Prediction Handling
// -------------------------
if (predictBtn) {
    predictBtn.addEventListener("click", function () {
        if (!selectedFile) {
            alert("Please select an image first.");
            return;
        }

        hideError();

        if (loadingState) loadingState.classList.remove("hidden");
        if (resultsSection) resultsSection.classList.add("hidden");

        const formData = new FormData();
        formData.append("image", selectedFile);

        fetch("/predict", {
            method: "POST",
            body: formData
        })
            .then(async response => {
                const data = await response.json().catch(() => ({ error: "Failed to parse server response." }));
                if (!response.ok || data.error) {
                    throw new Error(data.error || `Server error (${response.status})`);
                }
                return data;
            })
            .then(data => {
                if (loadingState) loadingState.classList.add("hidden");

                hideError();

                const formattedDisease = (data.disease || "Unknown Condition").replace(/_/g, " ");

                // Disease Name
                const diseaseEl = document.getElementById("disease-name");
                if (diseaseEl) diseaseEl.innerText = formattedDisease;

                // Confidence
                const confidenceVal = data.confidence !== undefined ? data.confidence : 0;
                const confEl = document.getElementById("confidence");
                if (confEl) confEl.innerText = confidenceVal + "%";

                // Description
                const descEl = document.getElementById("description");
                if (descEl) descEl.innerText = data.description || "No description available.";

                // Treatment
                const treatEl = document.getElementById("treatment");
                if (treatEl) treatEl.innerText = data.treatment || "No treatment required.";

                // Prevention
                const prevEl = document.getElementById("prevention");
                if (prevEl) prevEl.innerText = data.prevention || "Maintain good field sanitation.";

                // Health Status & Styling
                const healthStatus = data.health_status || (formattedDisease.toLowerCase().includes("healthy") ? "Healthy" : "Diseased");
                const isHealthy = healthStatus.toLowerCase() === "healthy";

                const healthStatusEl = document.getElementById("health-status");
                if (healthStatusEl) {
                    healthStatusEl.innerText = healthStatus;

                    // Update parent health card border
                    const healthCard = healthStatusEl.closest(".border-t-4");
                    if (healthCard) {
                        healthCard.classList.toggle("border-t-error", !isHealthy);
                        healthCard.classList.toggle("border-t-secondary", isHealthy);
                    }

                    // Update icon
                    const healthIcon = healthStatusEl.previousElementSibling;
                    if (healthIcon && healthIcon.classList.contains("material-symbols-outlined")) {
                        healthIcon.innerText = isHealthy ? "check_circle" : "coronavirus";
                        healthIcon.classList.toggle("text-error", !isHealthy);
                        healthIcon.classList.toggle("text-secondary", isHealthy);
                    }

                    healthStatusEl.classList.toggle("text-error", !isHealthy);
                    healthStatusEl.classList.toggle("text-secondary", isHealthy);
                }

                // Confidence Progress Bar
                const confBar = document.getElementById("confidence-bar");
                if (confBar) {
                    confBar.style.width = confidenceVal + "%";
                    // Update Confidence Level number if present
                    const confMetric = confBar.closest('.flex-grow')?.previousElementSibling;
                    if (confMetric && confMetric.classList.contains('font-data-metric')) {
                        confMetric.innerText = confidenceVal + "%";
                    }
                }

                latestScanData = data;

                if (resultsSection) {
                    resultsSection.classList.remove("hidden");
                    resultsSection.scrollIntoView({ behavior: "smooth" });
                }
            })
            .catch(error => {
                if (loadingState) loadingState.classList.add("hidden");
                showError(error.message || "An error occurred while processing the image. Please try again.");
                console.error("Prediction error:", error);
            });
    });
}

// -------------------------
// PDF Diagnostic Report Generator
// -------------------------
function getImageDataUrl(url) {
    return new Promise((resolve) => {
        if (!url) return resolve('');
        if (url.startsWith('data:')) return resolve(url);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 300;
                canvas.height = img.naturalHeight || img.height || 300;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.92));
            } catch (e) {
                resolve(url);
            }
        };
        img.onerror = function () {
            resolve(url);
        };
        img.src = url;
    });
}

function loadPdfDependencies() {
    return new Promise(async (resolve, reject) => {
        try {
            if (!window.html2canvas) {
                await new Promise((res, rej) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                    script.onload = res;
                    script.onerror = rej;
                    document.head.appendChild(script);
                });
            }
            if (!window.jspdf) {
                await new Promise((res, rej) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@latest/dist/jspdf.umd.min.js';
                    script.onload = res;
                    script.onerror = rej;
                    document.head.appendChild(script);
                });
            }
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

async function downloadPDFReport(customData) {
    const reportData = customData || latestScanData;
    if (!reportData) {
        console.warn("No diagnostic scan data available for report generation.");
        return;
    }

    const diseaseRaw = reportData.disease || 'Unknown';
    const diseaseName = diseaseRaw.replace(/_/g, ' ');
    const healthStatus = reportData.health_status || (diseaseRaw.toLowerCase().includes('healthy') ? 'Healthy' : 'Diseased');
    const isHealthy = healthStatus.toLowerCase() === 'healthy';
    const statusColor = isHealthy ? '#1f6d1a' : '#ba1a1a';
    const statusBg = isHealthy ? '#e8f5e9' : '#ffebee';
    const confidence = reportData.confidence || 0;
    const dateStr = reportData.created_at ? new Date(reportData.created_at).toLocaleString() : new Date().toLocaleString();

    let rawImg = reportData.image_path || reportData.image || '';
    const previewElement = document.getElementById("image-preview");
    if (!rawImg && previewElement && previewElement.src) {
        rawImg = previewElement.src;
    }

    let rawImgSrc = '';
    if (rawImg) {
        if (rawImg.startsWith('http://') || rawImg.startsWith('https://') || rawImg.startsWith('data:')) {
            rawImgSrc = rawImg;
        } else if (rawImg.startsWith('/')) {
            rawImgSrc = rawImg;
        } else {
            rawImgSrc = '/' + rawImg;
        }
    }

    const imgSrc = rawImgSrc ? await getImageDataUrl(rawImgSrc) : '';

    const reportHTML = `
        <div style="width: 660px; background: #ffffff; padding: 20px 24px; font-family: Arial, Helvetica, sans-serif; color: #191c1d; box-sizing: border-box;">
            <table style="width: 100%; border-bottom: 2px solid #012d1d; padding-bottom: 10px; margin-bottom: 14px; border-collapse: collapse;">
                <tr>
                    <td style="vertical-align: bottom;">
                        <h1 style="color: #012d1d; margin: 0; font-size: 20px; font-weight: bold;">🌱 AgriGuard AI Diagnostic Report</h1>
                        <p style="color: #414844; margin: 3px 0 0 0; font-size: 11px;">Official Crop Pathology &amp; Botanical AI Analysis</p>
                    </td>
                    <td style="text-align: right; vertical-align: bottom;">
                        <p style="margin: 0; font-size: 11px; font-weight: bold; color: #012d1d;">REPORT ID: #AG-${Math.floor(100000 + Math.random() * 900000)}</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: #717973;">Date: ${dateStr}</p>
                    </td>
                </tr>
            </table>

            <table style="width: 100%; margin-bottom: 14px; border-collapse: collapse;">
                <tr>
                    ${imgSrc ? `
                    <td style="width: 140px; vertical-align: top; padding-right: 14px;">
                        <div style="width: 140px; height: 120px; border: 1px solid #c1c8c2; border-radius: 8px; overflow: hidden; background: #000;">
                            <img src="${imgSrc}" style="width: 140px; height: 120px; object-fit: cover;" />
                        </div>
                    </td>` : ''}
                    
                    <td style="vertical-align: top;">
                        <div style="background: #f8f9fa; border: 1px solid #c1c8c2; border-radius: 8px; padding: 12px 16px; border-left: 5px solid ${statusColor}; min-height: 120px; box-sizing: border-box;">
                            <table style="width: 100%; margin-bottom: 6px; border-collapse: collapse;">
                                <tr>
                                    <td style="font-size: 10px; color: #717973; text-transform: uppercase; font-weight: bold;">Detected Crop Condition</td>
                                    <td style="text-align: right;">
                                        <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 3px 10px; border-radius: 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; display: inline-block;">
                                            ${healthStatus.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            
                            <h2 style="margin: 4px 0 10px 0; color: #012d1d; font-size: 18px; font-weight: bold;">${diseaseName}</h2>

                            <table style="width: 100%; margin-bottom: 4px; border-collapse: collapse;">
                                <tr>
                                    <td style="font-size: 10px; color: #717973; font-weight: bold;">AI Prediction Confidence</td>
                                    <td style="text-align: right; font-size: 12px; font-weight: bold; color: #012d1d;">${confidence}%</td>
                                </tr>
                            </table>
                            <div style="width: 100%; background: #e7e8e9; height: 7px; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${confidence}%; background: ${statusColor}; height: 7px;"></div>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>

            <div style="margin-bottom: 12px; background: #ffffff; border: 1px solid #e7e8e9; border-radius: 6px; padding: 10px 14px;">
                <h3 style="color: #012d1d; font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">
                    📋 Diagnostic Description &amp; Symptoms
                </h3>
                <p style="margin: 0; font-size: 11px; color: #414844; line-height: 1.5;">${reportData.description || 'No detailed description available.'}</p>
            </div>

            <div style="margin-bottom: 12px; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 6px; padding: 10px 14px; border-left: 4px solid #1f6d1a;">
                <h3 style="color: #1f6d1a; font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">
                    🧪 Recommended Immediate Treatment Protocol
                </h3>
                <p style="margin: 0; font-size: 11px; color: #1b5e20; line-height: 1.5; font-weight: 500;">${reportData.treatment || 'No chemical or organic treatment required.'}</p>
            </div>

            <div style="margin-bottom: 16px; background: #ffffff; border: 1px solid #e7e8e9; border-radius: 6px; padding: 10px 14px;">
                <h3 style="color: #012d1d; font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">
                    🛡️ Long-Term Prevention &amp; Management Guidelines
                </h3>
                <p style="margin: 0; font-size: 11px; color: #414844; line-height: 1.5;">${reportData.prevention || 'Maintain standard agricultural sanitation and crop rotation.'}</p>
            </div>

            <table style="width: 100%; border-top: 1px solid #c1c8c2; padding-top: 10px; border-collapse: collapse;">
                <tr>
                    <td style="font-size: 9px; color: #717973;">
                        <p style="margin: 0; font-weight: bold; color: #012d1d;">AgriGuard AI Pathology Neural Engine v4.2</p>
                        <p style="margin: 1px 0 0 0;">Validated against PlantVillage Deep Learning Dataset</p>
                    </td>
                    <td style="text-align: right; font-size: 9px; color: #717973;">
                        <p style="margin: 0; font-weight: bold; color: #1f6d1a;">✓ Verified Electronic Diagnostic Certificate</p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.top = '-9999px';
    element.style.left = '-9999px';
    element.style.width = '660px';
    element.style.backgroundColor = '#ffffff';
    element.innerHTML = reportHTML;
    document.body.appendChild(element);

    try {
        await loadPdfDependencies();

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            throw new Error("jsPDF library not available.");
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const imgWidth = pdfWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - margin * 2);
        }

        const filename = `AgriGuard_Report_${diseaseName.replace(/\s+/g, '_')}.pdf`;
        pdf.save(filename);

    } catch (err) {
        console.error("PDF generation failed:", err);
    } finally {
        if (element.parentNode) element.parentNode.removeChild(element);
    }
}