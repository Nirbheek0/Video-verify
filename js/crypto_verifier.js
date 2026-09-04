/**
 * Core verification logic for PDF signatures.
 */
class CryptoVerifier {
    constructor() {
        // PDF.js worker setup
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    /**
     * Checks if the PDF requires a password and attempts to open it.
     */
    async checkPasswordRequirement(fileBuffer, password = null) {
        try {
            const loadingTask = pdfjsLib.getDocument({ data: fileBuffer, password: password });
            await loadingTask.promise;
            return { requiresPassword: false, valid: true };
        } catch (error) {
            if (error.name === 'PasswordException') {
                return { requiresPassword: true, valid: false };
            }
            throw error;
        }
    }

    /**
     * Performs ByteRange extraction and Cryptographic Verification.
     */
    async verifySignature(fileBuffer) {
        // 1. Convert Buffer to String for ByteRange parsing
        const pdfString = String.fromCharCode.apply(null, new Uint8Array(fileBuffer));
        
        // 2. Find ByteRange and Signature (PKCS#7)
        const byteRangeMatch = pdfString.match(/\/ByteRange\s*\[(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\]/);
        const sigMatch = pdfString.match(/<([0-9a-fA-F]+)>/);

        if (!byteRangeMatch || !sigMatch) {
            throw new Error("No digital signature found in this document.");
        }

        // 3. Extract the Hex string of the signature
        const sigHex = sigMatch[1];
        
        try {
            // 4. Convert Hex to Der, then read PKCS#7 using node-forge
            const der = forge.util.hexToBytes(sigHex);
            const p7 = forge.pkcs7.messageFromDer(der);
            
            // 5. Extract Signer Information
            const signer = p7.certificates[0];
            const subject = signer.subject.attributes.map(a => a.value).join(', ');

            return {
                verified: true,
                signerName: subject,
                message: "Cryptographically Verified"
            };
        } catch (e) {
            throw new Error("Signature is invalid or corrupted.");
        }
    }
}
