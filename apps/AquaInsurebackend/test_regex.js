const { extractTotalFromText } = require('./utils/ocrUtils');

const text = `SUPERMARKET
Lorem ipsum 258
City Index - 02025
Tel.: +456-466-987-02
Name                Qty   Price
Lorem ipsum          1     $9.20
Lorem ipsum dolor sit 1     $19.20
Lorem ipsum          1     $15.00
Sub Total            $107.60
CASH                 $200.00
CHANGE               $92.40`;

function debug(text) {
    const upperText = text.toUpperCase();
    const lines = upperText.split('\n');
    let maxAmount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('TOTAL') || line.includes('AMOUNT') || line.includes('SUM') || line.includes('PAID') || line.includes('DUE') || line.includes('NET') || line.includes('BALANCE')) {
            console.log('Keyword Line:', line);
            let matches = line.match(/\d+(?:[.,]\d{1,2})?/g);
            console.log(' - matches:', matches);
            if ((!matches || matches.length === 0) && i + 1 < lines.length) {
                matches = lines[i + 1].match(/\d+(?:[.,]\d{1,2})?/g);
                console.log(' - next line matches:', matches);
            }
            if (matches) {
                for (const match of matches) {
                    const num = parseFloat(match.replace(/,/g, ''));
                    console.log('   - Parsed num:', num);
                    if (!isNaN(num) && num > maxAmount) {
                        maxAmount = num;
                    }
                }
            }
        }
    }
    console.log('Strat 1 Max:', maxAmount);

    if (maxAmount === 0 || maxAmount < 10) {
        const allNumbers = upperText.match(/\d{2,}(?:[.,]\d{2})?/g);
        console.log('Strat 2 allNumbers:', allNumbers);
        if (allNumbers) {
            for (const match of allNumbers) {
                if (match.length === 4 && (match.startsWith('202') || match.startsWith('19'))) continue;
                const num = parseFloat(match.replace(/,/g, ''));
                if (!isNaN(num) && num > maxAmount && num < 10000000) {
                    maxAmount = num;
                }
            }
        }
    }
    console.log('Final Max:', maxAmount);
}
debug(text);
