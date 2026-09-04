document.addEventListener('DOMContentLoaded', () => {
    const verifier = new CryptoVerifier();
    let currentFileBuffer = null;

    // UI Elements
    const screens = {
        disclaimer: document.getElementById('disclaimer-screen'),
        upload: document.getElementById('upload-screen'),
        result: document.getElementById('result-screen')
    };
    const modal = document.getElementById('password-modal');
    
    // Disclaimer Logic
    const cbAgree = document.getElementById('agree-checkbox');
    const btnProceed = document.getElementById('btn-proceed');
    
    cbAgree.addEventListener('change', (e) => {
        btnProceed.disabled = !e.target.checked;
    });

    btnProceed.addEventListener('click', () => {
        switchScreen('upload');
    });

    // Upload Logic
    const btnUpload = document.getElementById('btn-upload');
    const fileInput = document.getElementById('pdf-upload');

    btnUpload.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            currentFileBuffer = event.target.result;
            await processFile(currentFileBuffer);
        };
        reader.readAsArrayBuffer(file);
    });

    // Password Logic
    const btnVerifyPwd = document.getElementById('btn-verify-password');
    const inputPwd = document.getElementById('pdf-password');

    btnVerifyPwd.addEventListener('click', async () => {
        const pwd = inputPwd.value;
        await processFile(currentFileBuffer, pwd);
    });

    // Reset Logic
    document.getElementById('btn-reset').addEventListener('click', () => {
        fileInput.value = '';
        currentFileBuffer = null;
        inputPwd.value = '';
        switchScreen('upload');
    });

    // Core Processing Flow
    async function processFile(buffer, password = null) {
        try {
            // 1. Check if password is correct/needed
            const auth = await verifier.checkPasswordRequirement(buffer, password);
            
            if (auth.requiresPassword) {
                modal.classList.add('active');
                if (password) alert('Incorrect Password. Try again.');
                return;
            }
            
            // Unlocked successfully
            modal.classList.remove('active');
            
            // 2. Perform Cryptographic check
            const result = await verifier.verifySignature(buffer);
            
            showResult(true, "Signature Valid", `Signed by: ${result.signerName}`);
            
        } catch (error) {
            modal.classList.remove('active');
            showResult(false, "Verification Failed", error.message);
        }
    }

    // UI Helpers
    function switchScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function showResult(isSuccess, title, details) {
        switchScreen('result');
        document.getElementById('success-icon').classList.toggle('hidden', !isSuccess);
        document.getElementById('error-icon').classList.toggle('hidden', isSuccess);
        
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-title').style.color = isSuccess ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)';
        document.getElementById('result-details').textContent = details;
    }
});
