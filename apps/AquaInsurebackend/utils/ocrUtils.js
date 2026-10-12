const path = require('path');
const { spawn } = require('child_process');
const pdf = require('pdf-parse');

const crypto = require('crypto');

// In-memory cache for fast repeated OCR lookups (keyed by buffer MD5)
const ocrMemoryCache = new Map();

/**
 * Helper to extract total amount with matched snippet and strategy details.
 */
function extractTotalWithDetails(text) {
    if (!text) {
        return { amount: 0, rawText: '', matchedSnippet: '', method: 'NONE' };
    }

    const upperText = text.toUpperCase();

    // Pre-process: remove all lines that contain "HSN" — these carry HSN codes like 03062300/3062300
    const lines = upperText.split('\n');
    const cleanedLines = lines.filter(line => !/\bHSN\b/.test(line));
    const cleanedText = cleanedLines.join('\n');

    // --- Strategy 1: Direct "TOTAL RS" or "TOTAL ₹" pattern ---
    const totalRsMatch = cleanedText.match(/TOTAL\s+RS\.?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (totalRsMatch) {
        const num = parseFloat(totalRsMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
            return {
                amount: num,
                rawText: text,
                matchedSnippet: totalRsMatch[0],
                method: 'TOTAL_RS'
            };
        }
    }

    const totalRupeeMatch = cleanedText.match(/TOTAL\s*₹\s*([\d,]+(?:\.\d{1,2})?)/);
    if (totalRupeeMatch) {
        const num = parseFloat(totalRupeeMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
            return {
                amount: num,
                rawText: text,
                matchedSnippet: totalRupeeMatch[0],
                method: 'RUPEE_SYMBOL'
            };
        }
    }

    const generalTotalMatch = cleanedText.match(/(?:GRAND TOTAL|NET PAYABLE|AMOUNT PAYABLE|TOTAL AMOUNT|TOTAL VALUE|BILL AMOUNT)[^\d\n]*([\d,]+(?:\.\d{1,2})?)/);
    if (generalTotalMatch) {
        const num = parseFloat(generalTotalMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
            return {
                amount: num,
                rawText: text,
                matchedSnippet: generalTotalMatch[0],
                method: 'GENERAL_TOTAL'
            };
        }
    }

    // --- Strategy 2: Keyword lines — prefer numbers right after RS./₹ ---
    const keywordRegex = /\b(TOTAL|AMOUNT|SUM|PAID|DUE|NET|BALANCE|PAYABLE|VALUE|GRAND)\b/;
    let maxAmount = 0;
    let matchedSnippet = '';

    for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];
        if (!keywordRegex.test(line)) continue;

        const currencyMatch = line.match(/(?:RS\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/);
        if (currencyMatch) {
            const num = parseFloat(currencyMatch[1].replace(/,/g, ''));
            if (!isNaN(num) && num > maxAmount) {
                maxAmount = num;
                matchedSnippet = currencyMatch[0];
                continue;
            }
        }

        let matches = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
        if ((!matches || matches.length === 0) && i + 1 < cleanedLines.length) {
            matches = cleanedLines[i + 1].match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
        }
        if (matches) {
            for (const match of matches) {
                const num = parseFloat(match.replace(/,/g, ''));
                if (!isNaN(num) && num > maxAmount) {
                    maxAmount = num;
                    matchedSnippet = `${line.trim().slice(0, 50)} -> ${match}`;
                }
            }
        }
    }
    if (maxAmount > 0) {
        return {
            amount: maxAmount,
            rawText: text,
            matchedSnippet: matchedSnippet || `Keyword Line Match: ₹${maxAmount}`,
            method: 'KEYWORD_LINE'
        };
    }

    // --- Strategy 3: Fallback — largest currency-looking number in cleaned text ---
    const allNumbers = cleanedText.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})?\b/g);
    if (allNumbers) {
        for (const match of allNumbers) {
            if (match.length === 4 && (match.startsWith('202') || match.startsWith('19'))) continue;
            const num = parseFloat(match.replace(/,/g, ''));
            if (!isNaN(num) && num > maxAmount && num < 10000000) {
                maxAmount = num;
                matchedSnippet = `Fallback match: ${match}`;
            }
        }
    }

    return {
        amount: maxAmount,
        rawText: text,
        matchedSnippet: matchedSnippet || (maxAmount > 0 ? `Detected ₹${maxAmount}` : 'No monetary amount detected'),
        method: maxAmount > 0 ? 'LARGEST_NUMBER_FALLBACK' : 'NONE'
    };
}

/**
 * Backwards compatible helper to extract total amount from text.
 */
function extractTotalFromText(text) {
    return extractTotalWithDetails(text).amount;
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
 * Extracts detailed text, matched total, and metadata from a binary buffer (PDF or Image).
 * Cached in memory via MD5 hash to prevent redundant OCR work.
 */
async function processBillBufferDetailed(buffer, mimeType) {
    if (!buffer || buffer.length === 0) {
        return { amount: 0, rawText: '', matchedSnippet: '', method: 'NONE' };
    }

    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    if (ocrMemoryCache.has(hash)) {
        return ocrMemoryCache.get(hash);
    }

    let text = '';
    try {
        if (mimeType === 'application/pdf') {
            let pdfBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            const data = await pdf(pdfBuffer);
            text = data.text || '';

            if (text.trim().length < 15) {
                console.log('[OCR] PDF contains minimal text (possibly scanned without OCR layers).');
            }
        } else if (mimeType && mimeType.startsWith('image/')) {
            let imageBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            try {
                text = await runPaddleOCR(imageBuffer);
            } catch (err) {
                console.error('[OCR] PaddleOCR image processing warning:', err.message);
            }
        } else {
            console.log('[OCR] Skipping unrecognized buffer type:', mimeType);
        }

        const result = extractTotalWithDetails(text);
        ocrMemoryCache.set(hash, result);
        return result;
    } catch (err) {
        console.error('[OCR] Processing error:', err.message);
        return { amount: 0, rawText: '', matchedSnippet: `OCR Error: ${err.message}`, method: 'ERROR' };
    }
}

/**
 * Extracts total amount from a binary buffer (PDF or Image).
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimeType - The file's mime type (e.g., 'application/pdf', 'image/jpeg')
 * @returns {Promise<number>} - The extracted total amount
 */
async function processBillBuffer(buffer, mimeType) {
    const res = await processBillBufferDetailed(buffer, mimeType);
    return res.amount;
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
    processBillBufferDetailed,
    extractTotalFromText,
    extractTotalWithDetails,
    isAadhaarDocument,
    extractAadhaarDetailsFromText
};
