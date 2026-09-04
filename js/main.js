document.addEventListener('DOMContentLoaded', () => {
    const verifier = new CryptoVerifier();
    let currentFileBuffer = null;

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

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

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

    async function processFile(buffer, password = null) {
        try {
            const auth = await verifier.checkPasswordRequirement(buffer, password);
            
            if (auth.requiresPassword) {
                modal.classList.add('active');
                if (password) alert('Incorrect Password. Try again.');
                return;
            }
            
            modal.classList.remove('active');
            showResult(true, "Processing...", "Extracting cryptographic signature...");
            
            // Small timeout to allow UI to render processing state smoothly
            setTimeout(async () => {
                try {
                    const result = await verifier.verifySignature(buffer);
                    showResult(true, "Signature Valid", `Signed by: ${result.signerName}`);
                } catch (err) {
                    showResult(false, "Verification Failed", err.message);
                }
            }, 100);
            
        } catch (error) {
            modal.classList.remove('active');
            showResult(false, "Error", error.message);
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
    }
});
