document.addEventListener('DOMContentLoaded', () => {
    const verifier = new CryptoVerifier();
    let currentFileBuffer = null;
    let currentFileName = "document.pdf";

    const screens = {
        disclaimer: document.getElementById('disclaimer-screen'),
        upload: document.getElementById('upload-screen'),
        result: document.getElementById('result-screen')
    };
    const modal = document.getElementById('password-modal');
    
    const cbAgree = document.getElementById('agree-checkbox');
    const btnProceed = document.getElementById('btn-proceed');
    
    cbAgree.addEventListener('change', (e) => {
        btnProceed.disabled = !e.target.checked;
    });

    btnProceed.addEventListener('click', () => {
        switchScreen('upload');
    });

    const fileInput = document.getElementById('pdf-upload');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        showResult(true, "Reading File...", "Loading PDF into memory...");
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            currentFileBuffer = event.target.result;
            await processFile(currentFileBuffer);
        };
        reader.onerror = () => {
            showResult(false, "File Error", "Failed to read the selected PDF file.");
        };
        reader.readAsArrayBuffer(file);
    });

    const btnVerifyPwd = document.getElementById('btn-verify-password');
    const inputPwd = document.getElementById('pdf-password');

    btnVerifyPwd.addEventListener('click', async () => {
        const pwd = inputPwd.value;
        if (!pwd) return alert('Please enter a password');
        modal.classList.remove('active');
        await processFile(currentFileBuffer, pwd);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        fileInput.value = '';
        currentFileBuffer = null;
        inputPwd.value = '';
        switchScreen('upload');
    });

    document.getElementById('btn-download').addEventListener('click', () => {
        if (!currentFileBuffer) return;
        const blob = new Blob([currentFileBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    async function processFile(buffer, password = null) {
        try {
            const auth = await verifier.checkPasswordRequirement(buffer, password);
            
            if (auth.requiresPassword) {
                modal.classList.add('active');
                if (password) alert('Incorrect Password. Try again.');
                return;
            }
            
            modal.classList.remove('active');
            showResult(true, "Processing...", "Extracting signature and rendering preview...");
            
            setTimeout(async () => {
                try {
                    const result = await verifier.verifySignature(buffer, password);
                    showResult(true, "Signature Valid", `Signed by: ${result.signerName}`);
                    renderPdfPreview(result.pdfDoc);
                    document.getElementById('btn-download').classList.remove('hidden');
                } catch (err) {
                    showResult(false, "Verification Failed", err.message);
                }
            }, 100);
            
        } catch (error) {
            modal.classList.remove('active');
            showResult(false, "Error", error.message);
        }
    }

    async function renderPdfPreview(pdfDoc) {
        try {
            const page = await pdfDoc.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            document.getElementById('pdf-preview-container').classList.remove('hidden');
        } catch (e) {
            console.error("Preview render failed", e);
        }
    }

    function switchScreen(screenName) {
        Object.keys(screens).forEach(key => {
            if (key === screenName) {
                screens[key].classList.add('active');
            } else {
                screens[key].classList.remove('active');
            }
        });
        modal.classList.remove('active');
    }

    function showResult(isSuccess, title, details) {
        switchScreen('result');
        const isProcessing = title === "Processing..." || title === "Reading File...";
        
        document.getElementById('success-icon').classList.toggle('hidden', !isSuccess || isProcessing);
        document.getElementById('error-icon').classList.toggle('hidden', isSuccess || isProcessing);
        
        const titleEl = document.getElementById('result-title');
        titleEl.textContent = title;
        titleEl.style.color = isProcessing ? 'var(--md-sys-color-on-surface)' : (isSuccess ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)');
        
        document.getElementById('result-details').textContent = details;
        if (isProcessing) {
            document.getElementById('pdf-preview-container').classList.add('hidden');
            document.getElementById('btn-download').classList.add('hidden');
        }
    }
});
