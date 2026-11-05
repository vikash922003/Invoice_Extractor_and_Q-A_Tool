import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

function generatePdfBuffer(lines: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text('INVOICE / RECEIPT', { align: 'center' });
    doc.moveDown(0.5);

    for (const line of lines) {
      if (line.startsWith('---')) {
        doc.fontSize(10).font('Helvetica').text('------------------------------------------------------------');
      } else if (line.startsWith('VENDOR:') || line.startsWith('TOTAL:')) {
        doc.fontSize(12).font('Helvetica-Bold').text(line);
      } else {
        doc.fontSize(11).font('Helvetica').text(line);
      }
      doc.moveDown(0.2);
    }

    doc.end();
  });
}

async function createReceiptPng(item: any): Promise<Buffer> {
  const lineItemStr = (item.line_items || []).map((li: any) => 
    `${li.description} | Qty: ${li.quantity} | Price: ${li.unit_price} | Amount: ${li.amount}`
  ).join('\n');

  const svg = `
<svg width="600" height="420" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <rect x="20" y="20" width="560" height="380" fill="none" stroke="#e2e8f0" stroke-width="2" rx="12" />
  <text x="50" y="60" font-family="Arial" font-size="20" font-weight="bold" fill="#0f172a">TAX INVOICE / RECEIPT</text>
  <text x="50" y="100" font-family="Arial" font-size="14" font-weight="bold" fill="#1e293b">VENDOR: ${item.vendor_name}</text>
  <text x="50" y="130" font-family="Arial" font-size="13" fill="#475569">INVOICE: ${item.invoice_number}</text>
  <text x="50" y="155" font-family="Arial" font-size="13" fill="#475569">DATE: ${item.invoice_date}</text>
  <text x="50" y="180" font-family="Arial" font-size="13" fill="#475569">CURRENCY: ${item.currency}</text>
  <line x1="50" y1="200" x2="550" y2="200" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="50" y="230" font-family="Arial" font-size="12" fill="#0f172a">${lineItemStr}</text>
  <line x1="50" y1="250" x2="550" y2="250" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="50" y="280" font-family="Arial" font-size="13" fill="#334155">SUBTOTAL: ${item.subtotal.toFixed(2)}</text>
  <text x="50" y="305" font-family="Arial" font-size="13" fill="#334155">TAX: ${item.tax.toFixed(2)}</text>
  <text x="50" y="345" font-family="Arial" font-size="16" font-weight="bold" fill="#0f172a">TOTAL: ${item.total.toFixed(2)}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  let baseDir = process.cwd();
  if (baseDir.endsWith('/backend')) baseDir = path.resolve(baseDir, '..');

  const targetDir = path.resolve(baseDir, 'fixtures', 'invoices');
  await fs.mkdir(targetDir, { recursive: true });

  const truthFile = path.resolve(baseDir, 'fixtures', 'expected_values.json');
  const items = JSON.parse(await fs.readFile(truthFile, 'utf-8'));

  for (const item of items) {
    const filePath = path.join(targetDir, item.filename);
    if (item.filename.endsWith('.pdf')) {
      const lines = [
        `VENDOR: ${item.vendor_name}`,
        `INVOICE: ${item.invoice_number}`,
        `DATE: ${item.invoice_date}`,
        `CURRENCY: ${item.currency}`,
        `----------------------------------------`,
        ...(item.line_items || []).map((li: any) => `${li.description} | Qty: ${li.quantity} | Price: ${li.unit_price} | Amount: ${li.amount}`),
        `----------------------------------------`,
        `SUBTOTAL: ${item.subtotal.toFixed(2)}`,
        `TAX: ${item.tax.toFixed(2)}`,
        `TOTAL: ${item.total.toFixed(2)}`
      ];
      const buf = await generatePdfBuffer(lines);
      await fs.writeFile(filePath, buf);
    } else {
      const pngBuf = await createReceiptPng(item);
      await fs.writeFile(filePath, pngBuf);
    }
    console.log(`Generated standard fixture: ${item.filename}`);
  }
}

main().catch(console.error);
