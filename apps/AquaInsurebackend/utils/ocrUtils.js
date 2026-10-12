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
 * Looks for UIDAI keywords, Aadhaar phrases, 12-digit patterns, or DOB/Gender combos.
 */
function isAadhaarDocument(text) {
    if (!text) return false;
    const upper = text.toUpperCase();
    const keywords = [
        'UIDAI', 'UNIQUE IDENTIFICATION', 'AADHAAR', 'AADHAR', 'ADHAAR',
        'GOVT. OF INDIA', 'GOVERNMENT OF INDIA', 'GOVERNMENTOF INDIA', 'GOVT OF INDIA',
        'BHARAT SARKAR', 'ENROLMENT', 'ENROLLMENT', 'MERA AADHAAR', 'MERI PEHCHAN',
        'AUTHORITY OF INDIA', 'HELP@UIDAI', 'WWW.UIDAI', 'VID :'
    ];
    const hasKeyword = keywords.some(kw => upper.includes(kw));
    const has12Digits = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/.test(text) || /\b\d{12}\b/.test(text);
    const hasAadhaarPatt = /(?:X{4}|x{4}|\*{4}|•{4})[\s\-]+(?:X{4}|x{4}|\*{4}|•{4})[\s\-]+\d{4}/.test(text);
    const hasDobAndGender = /(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth|जन्म)/i.test(text) && /(?:Male|Female|पुरुष|महिला)/i.test(text);
    const hasAadhaarNative = /आधार|भारत सरकार|विशिष्ट पहचान/.test(text);

    return hasKeyword || has12Digits || hasAadhaarPatt || hasDobAndGender || hasAadhaarNative;
}

/**
 * Extracts structured details from Aadhaar card OCR text.
 * Returns: { aadhaarNumber, name, fatherName, dob, gender, address }
 */
function extractAadhaarDetailsFromText(text) {
    if (!text) return null;

    const result = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. AADHAAR NUMBER — 12 digits or masked
    const m12 = text.match(/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/) ||
                text.match(/\b\d{8}[\s\-]?\d{4}\b/) ||
                text.match(/\b\d{12}\b/);
    if (m12) {
        result.aadhaarNumber = m12[0].replace(/[\s\-]/g, '');
    } else {
        const masked = text.match(/\b(?:X{4}|x{4}|\*{4}|•{4})[\s\-]+(?:X{4}|x{4}|\*{4}|•{4})[\s\-]+(\d{4})\b/);
        if (masked) {
            result.aadhaarNumber = 'XXXXXXXX' + masked[1];
        }
    }

    // 2. GENDER
    if (/\bfemale\b|महिला|femal/i.test(text)) {
        result.gender = 'female';
    } else if (/\bmale\b|पुरुष/i.test(text)) {
        result.gender = 'male';
    } else if (/\btransgender\b|trans/i.test(text)) {
        result.gender = 'other';
    }

    // 3. DOB (Date of Birth) -> formatted as YYYY-MM-DD for HTML <input type="date">
    let dobMatch = text.match(/(?:DOB|Date\s*of\s*Birth|जन्म\s*तिथि|जन्म\s*तारीख|D\.O\.B)[\s\:\/\.\-]*(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/i) ||
                   text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);

    if (dobMatch) {
        let day = parseInt(dobMatch[1], 10);
        let month = parseInt(dobMatch[2], 10);
        const year = parseInt(dobMatch[3], 10);

        if (year >= 1920 && year <= 2025) {
            if (month > 12 && day <= 12) {
                const tmp = day; day = month; month = tmp;
            }
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                result.dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
    } else {
        const yobMatch = text.match(/(?:Year\s*of\s*Birth|YOB|जन्म\s*वर्ष)[\s\:\/\.\-]*(\d{4})/i);
        if (yobMatch) {
            const yr = parseInt(yobMatch[1], 10);
            if (yr >= 1920 && yr <= 2025) {
                result.dob = `${yr}-01-01`;
            }
        }
    }

    // 4. FATHER / GUARDIAN NAME
    const relationPatterns = [
        /\b(?:S\/O|D\/O|W\/O|C\/O|S\.O|D\.O|W\.O|C\.O|Son\s+of|Daughter\s+of|Wife\s+of|Care\s+of|Father(?:'s)?\s*Name|पिता)\b[\s\:\-\.]*([A-Za-z][A-Za-z \.\'\-]{2,35})/i,
    ];
    for (const pat of relationPatterns) {
        const m = text.match(pat);
        if (m) {
            let candidate = m[1].split(/[\n,;]/)[0].trim().replace(/[\d,\.\s]+$/, '').trim();
            if (candidate && candidate.length >= 2 && !/address|village|house|near|road/i.test(candidate)) {
                result.fatherName = candidate;
                break;
            }
        }
    }

    // 5. NAME EXTRACTION
    const nameExclude = /government|india|bharat|sarkar|authority|unique|identification|uidai|enrolment|enrollment|help@|www\.|aadhaar|aadhar|dob|date\s*of\s*birth|year\s*of\s*birth|yob|male|female|address|village|vill|dist|district|state|pincode|pin|taluk|mandal|post|house|flat|road|street|ward|near|\d{4}/i;

    // Strategy A: Line directly before DOB
    let dobLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/(?:dob|date\s*of\s*birth|year\s*of\s*birth|yob|जन्म)/i.test(lines[i])) {
            dobLineIdx = i;
            break;
        }
    }
    if (dobLineIdx > 0) {
        for (let i = dobLineIdx - 1; i >= 0 && i >= dobLineIdx - 3; i--) {
            const l = lines[i];
            if (/^[A-Za-z][A-Za-z \.\'\-]{2,40}$/.test(l) && !nameExclude.test(l) && l.split(/\s+/).length <= 4) {
                result.name = l.trim();
                break;
            }
        }
    }

    // Strategy B: 'To <Name>' pattern on e-Aadhaar letters
    if (!result.name) {
        const toMatch = text.match(/(?:^|\n)To\s*\n\s*([A-Za-z][A-Za-z \.\'\-]{2,40})/i);
        if (toMatch && !nameExclude.test(toMatch[1])) {
            result.name = toMatch[1].trim();
        }
    }

    // Strategy C: First clean alphabetic line after header
    if (!result.name) {
        let afterHeader = false;
        for (const l of lines) {
            if (/government.*india|bharat\s*sarkar|uidai|authority/i.test(l)) {
                afterHeader = true;
                continue;
            }
            if (afterHeader && /^[A-Za-z][A-Za-z \.\'\-]{2,40}$/.test(l) && !nameExclude.test(l) && l.split(/\s+/).length <= 4) {
                result.name = l.trim();
                break;
            }
        }
    }

    // Strategy D: Global line scan fallback
    if (!result.name) {
        for (const l of lines) {
            if (/^[A-Za-z][A-Za-z \.\'\-]{2,40}$/.test(l) && !nameExclude.test(l) && l.split(/\s+/).length <= 4) {
                result.name = l.trim();
                break;
            }
        }
    }

    // 6. ADDRESS & PINCODE (if address info present on card)
    const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) {
        result.address = result.address || {};
        result.address.pinCode = pinMatch[1];
    }

    // State detection
    const STATES_LIST = [
        'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Karnataka', 'Kerala',
        'Maharashtra', 'Gujarat', 'Odisha', 'West Bengal', 'Punjab',
        'Haryana', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Bihar',
        'Jharkhand', 'Chhattisgarh', 'Assam', 'Goa', 'Delhi'
    ];
    for (const st of STATES_LIST) {
        if (new RegExp('\\b' + st + '\\b', 'i').test(text)) {
            result.address = result.address || {};
            result.address.state = st;
            break;
        }
    }

    // District detection (handles both "<Name> District" and "District: <Name>")
    const distMatch1 = text.match(/\b([A-Za-z][A-Za-z\s]{2,25})\s+District\b/i);
    const distMatch2 = text.match(/\b(?:District|Dist|D\.T)\b[\s\:\-\.]*([A-Za-z][A-Za-z\s]{2,25})/i);
    const matchedDist = distMatch1 ? distMatch1[1] : (distMatch2 ? distMatch2[1] : null);
    if (matchedDist) {
        const cleaned = matchedDist.split(/[\n,;]/)[0].trim();
        if (cleaned.length >= 3 && !/village|taluk|mandal|state|india/i.test(cleaned)) {
            result.address = result.address || {};
            result.address.district = cleaned;
        }
    }

    // Taluk / Mandal detection (handles both "<Name> Taluk/Mandal" and "Taluk: <Name>")
    const talukMatch1 = text.match(/\b([A-Za-z][A-Za-z\s]{2,25})\s+(?:Taluk|Taluka|Mandal|Tehsil|Tahsil|Block)\b/i);
    const talukMatch2 = text.match(/\b(?:Taluk|Taluka|Mandal|Tehsil|Tahsil|Block)\b[\s\:\-\.]*([A-Za-z][A-Za-z\s]{2,25})/i);
    const matchedTaluk = talukMatch1 ? talukMatch1[1] : (talukMatch2 ? talukMatch2[1] : null);
    if (matchedTaluk) {
        const cleaned = matchedTaluk.split(/[\n,;]/)[0].trim();
        if (cleaned.length >= 3 && !/district|village|state|india/i.test(cleaned)) {
            result.address = result.address || {};
            result.address.taluk = cleaned;
        }
    }

    // Village detection (handles both "<Name> Village" and "Village: <Name>")
    const villMatch1 = text.match(/\b([A-Za-z][A-Za-z\s]{2,25})\s+Village\b/i);
    const villMatch2 = text.match(/\b(?:Village|Vill)\b[\s\:\-\.]*([A-Za-z][A-Za-z\s]{2,25})/i);
    const matchedVill = villMatch1 ? villMatch1[1] : (villMatch2 ? villMatch2[1] : null);
    if (matchedVill) {
        const cleaned = matchedVill.split(/[\n,;]/)[0].trim();
        if (cleaned.length >= 3 && !/district|taluk|mandal|state|india/i.test(cleaned)) {
            result.address = result.address || {};
            result.address.village = cleaned;
        }
    }

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
