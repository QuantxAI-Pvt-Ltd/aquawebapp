const path = require('path');
const { spawn } = require('child_process');
const pdf = require('pdf-parse');

/**
 * Helper to extract total amount from text.
 * Looks for common patterns like "Total: 100", "Amount: $100.50", "₹ 500", etc.
 * Adjust regex as needed based on actual bill formats.
 */
function extractTotalFromText(text) {
    if (!text) return 0;

    // Uppercase for case-insensitive matching
    const upperText = text.toUpperCase();

    // Pre-process: remove all lines that contain "HSN" — these carry HSN codes like 03062300/3062300
    // which are not amounts and corrupt the extraction.
    const lines = upperText.split('\n');
    const cleanedLines = lines.filter(line => !/\bHSN\b/.test(line));
    const cleanedText = cleanedLines.join('\n');

    // --- Strategy 1 (strongest): Direct "TOTAL RS" pattern anywhere in the text ---
    // Matches patterns like: "Total Rs. 203,760" / "TOTAL RS 203760" / "Total Rs.203,760"
    const totalRsMatch = cleanedText.match(/TOTAL\s+RS\.?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (totalRsMatch) {
        const num = parseFloat(totalRsMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) return num;
    }

    // Also try "₹" variant: "TOTAL ₹ 203,760"
    const totalRupeeMatch = cleanedText.match(/TOTAL\s*₹\s*([\d,]+(?:\.\d{1,2})?)/);
    if (totalRupeeMatch) {
        const num = parseFloat(totalRupeeMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) return num;
    }

    // New General Total Match for Feed and Electricity Bills
    const generalTotalMatch = cleanedText.match(/(?:GRAND TOTAL|NET PAYABLE|AMOUNT PAYABLE|TOTAL AMOUNT|TOTAL VALUE|BILL AMOUNT)[^\d\n]*([\d,]+(?:\.\d{1,2})?)/);
    if (generalTotalMatch) {
        const num = parseFloat(generalTotalMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) return num;
    }

    // --- Strategy 2: Keyword lines — prefer numbers right after RS./₹ ---
    const keywordRegex = /\b(TOTAL|AMOUNT|SUM|PAID|DUE|NET|BALANCE|PAYABLE|VALUE|GRAND)\b/;
    let maxAmount = 0;

    for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];
        if (!keywordRegex.test(line)) continue;

        // Prefer a number directly after RS. or ₹
        const currencyMatch = line.match(/(?:RS\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/);
        if (currencyMatch) {
            const num = parseFloat(currencyMatch[1].replace(/,/g, ''));
            if (!isNaN(num) && num > maxAmount) {
                maxAmount = num;
                continue;
            }
        }

        // Fallback: largest number on this line (or next line)
        // Fixed regex to correctly match comma-separated numbers like 1,23,456.78
        let matches = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
        if ((!matches || matches.length === 0) && i + 1 < cleanedLines.length) {
            matches = cleanedLines[i + 1].match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
        }
        if (matches) {
            for (const match of matches) {
                const num = parseFloat(match.replace(/,/g, ''));
                if (!isNaN(num) && num > maxAmount) maxAmount = num;
            }
        }
    }
    if (maxAmount > 0) return maxAmount;

    // --- Strategy 3: Fallback — largest currency-looking number in cleaned text ---
    const allNumbers = cleanedText.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
    if (allNumbers) {
        for (const match of allNumbers) {
            if (match.length === 4 && (match.startsWith('202') || match.startsWith('19'))) continue;
            const num = parseFloat(match.replace(/,/g, ''));
            if (!isNaN(num) && num > maxAmount && num < 10000000) maxAmount = num;
        }
    }

    return maxAmount;
}

/**
 * Runs PaddleOCR on an image buffer by spawning the Python wrapper script.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {Promise<string>} - Extracted text (lines joined with newlines)
 */
function runPaddleOCR(imageBuffer) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'paddle_ocr.py');
        const proc = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`paddle_ocr.py exited with code ${code}: ${stderr.trim()}`));
            } else {
                resolve(stdout);
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn python3: ${err.message}`));
        });

        // Pipe the image buffer into the Python script's stdin
        proc.stdin.write(imageBuffer);
        proc.stdin.end();
    });
}

/**
 * Extracts text and total amount from a binary buffer (PDF or Image).
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimeType - The file's mime type (e.g., 'application/pdf', 'image/jpeg')
 * @returns {Promise<number>} - The extracted total amount
 */
async function processBillBuffer(buffer, mimeType) {
    if (!buffer) return 0;

    let text = '';
    try {
        if (mimeType === 'application/pdf') {
            // Use pdf-parse for text-based PDFs (fast, no Python needed)
            let pdfBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            const data = await pdf(pdfBuffer);
            text = data.text;

            if (text.trim().length < 20) {
                console.log('PDF seems to be scanned (no embedded text). Returning 0.');
                return 0;
            }
        } else if (mimeType && mimeType.startsWith('image/')) {
            // Use PaddleOCR for images
            let imageBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            try {
                text = await runPaddleOCR(imageBuffer);
                console.log('PaddleOCR extracted text length:', text.length);
            } catch (err) {
                console.error('PaddleOCR processing failed for image:', err.message);
                return 0;
            }
        } else {
            console.log('Skipping unrecognized buffer type:', mimeType);
            return 0;
        }

        return extractTotalFromText(text);
    } catch (err) {
        console.error('OCR Extraction error:', err.message);
        return 0; // Return 0 on failure so export doesn't break
    }
}

/**
 * Checks if OCR text looks like an Aadhaar card.
 * Looks for UIDAI keywords or standard Aadhaar phrases.
 */
function isAadhaarDocument(text) {
    if (!text) return false;
    const upper = text.toUpperCase();
    const keywords = ['UIDAI', 'UNIQUE IDENTIFICATION', 'AADHAAR', 'AADHAR', 'GOVT. OF INDIA', 'GOVERNMENT OF INDIA'];
    // Must have at least one keyword AND a 12-digit number pattern
    const hasKeyword = keywords.some(kw => upper.includes(kw));
    const has12Digits = /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(text);
    return hasKeyword || has12Digits;
}

/**
 * Extracts structured details from Aadhaar card OCR text.
 * Returns: { aadhaarNumber, name, fatherName, dob, gender, pinCode }
 */
function extractAadhaarDetailsFromText(text) {
    if (!text) return null;

    const result = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. AADHAAR NUMBER — XXXX XXXX XXXX or 12 contiguous digits
    const aadhaarMatch = text.match(/\b(\d{4})\s(\d{4})\s(\d{4})\b/) ||
                         text.match(/(?<!\d)(\d{4})\s?(\d{4})\s?(\d{4})(?!\d)/);
    if (aadhaarMatch) {
        result.aadhaarNumber = aadhaarMatch[0].replace(/\s/g, '');
    }

    // NOTE: DOB is intentionally NOT extracted — user fills it manually.
    // (Remove this block if auto-fill is desired in the future)

    // 3. GENDER
    if (/\bfemale\b/i.test(text)) result.gender = 'female';
    else if (/\bmale\b/i.test(text)) result.gender = 'male';

    // 4. FATHER / GUARDIAN NAME
    // Aadhaar prints: "S/O: Name", "D/O Name", "W/O Name", also "Son of", "Father:"
    const relationPatterns = [
        /[Ss]\s*\/\s*[Oo]\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.]{2,50})/,
        /[Dd]\s*\/\s*[Oo]\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.]{2,50})/,
        /[Ww]\s*\/\s*[Oo]\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.]{2,50})/,
        /[Cc]\s*\/\s*[Oo]\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.]{2,50})/,
        /(?:Son|Daughter|Wife|Husband)\s+(?:of|:)\s*([A-Za-z][A-Za-z\s\.]{2,50})/i,
        /Father['s]*\s*(?:Name)?\s*[:\-]\s*([A-Za-z][A-Za-z\s\.]{2,50})/i,
    ];
    for (const pat of relationPatterns) {
        const m = text.match(pat);
        if (m) {
            result.fatherName = m[1].trim().replace(/[\d,\.\s]+$/, '').trim();
            break;
        }
    }

    // 5. NAME — first clean alphabetic line after the Aadhaar header
    const nameSkip = /uidai|unique|identification|authority|india|aadhaar|aadhar|enrolment|enrollment|dob|date of birth|year of birth|male|female|address|village|vill\.|dist\.|district|state|pin|taluk|post|house|flat|near|nagar|street|road|\d{4}/i;
    const nameCandidates = [];
    let headerPassed = false;

    for (const line of lines) {
        if (/government\s+of\s+india|aadhaar|aadhar/i.test(line)) { headerPassed = true; continue; }
        if (!headerPassed) continue;
        if (/^[A-Za-z][A-Za-z\s\.]{2,49}$/.test(line) && !nameSkip.test(line) && line.split(' ').length <= 5) {
            nameCandidates.push(line);
        }
    }
    // Fallback: scan all lines if header not found
    if (nameCandidates.length === 0) {
        for (const line of lines) {
            if (/^[A-Za-z][A-Za-z\s\.]{2,49}$/.test(line) && !nameSkip.test(line) && line.split(' ').length <= 5) {
                nameCandidates.push(line);
            }
        }
    }
    if (nameCandidates.length > 0) result.name = nameCandidates[0].trim();

    // NOTE: Pincode is intentionally NOT extracted — user fills it manually.

    return result;
}

module.exports = {
    processBillBuffer,
    extractTotalFromText,
    isAadhaarDocument,
    extractAadhaarDetailsFromText
};
