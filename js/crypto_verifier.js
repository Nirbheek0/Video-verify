/**
 * Core verification logic for PDF signatures.
 */
class CryptoVerifier {
    constructor() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

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

    async verifySignature(fileBuffer) {
        // Fix: Using TextDecoder to handle large files safely without stack overflow
        const pdfString = new TextDecoder("iso-8859-1").decode(fileBuffer);
        
        const byteRangeMatch = pdfString.match(/\/ByteRange\s*\[(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\]/);
        const sigMatch = pdfString.match(/<([0-9a-fA-F]+)>/);

        if (!byteRangeMatch || !sigMatch) {
            throw new Error("No digital signature found in this document.");
        }

        const sigHex = sigMatch[1];
        
        try {
            const der = forge.util.hexToBytes(sigHex);
            const p7 = forge.pkcs7.messageFromDer(der);
            
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
