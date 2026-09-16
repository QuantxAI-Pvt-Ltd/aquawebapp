const { extractTotalFromText } = require('./utils/ocrUtils.js');

const texts = [
  "FEED BILL\nHsn code 1234\nGrand Total 15,200.50\nThank you",
  "ELECTRICITY BILL\nAmount Payable: 1,22,500.00\nDue date 15/05/2026",
  "MISC BILL\nTotal Rs 450",
  "FEED BILL\nTOTAL VALUE ₹ 75,000",
  "Babu Feed Store\nNet Amount : 20,400\nBalance Due",
  "FEED BILL\nTotal 12,345"
];

for (const text of texts) {
  console.log("Extracted:", extractTotalFromText(text), "from", text.split('\n')[1] || text.split('\n')[0]);
}
