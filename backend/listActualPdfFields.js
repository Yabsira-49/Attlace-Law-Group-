/**
 * DIAGNOSTIC SCRIPT - List all PDF form fields
 * Run this to see exact field names in I-130.pdf
 * 
 * Usage: node listActualPdfFields.js
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function listPdfFields() {
  try {
    // Load the I-130 PDF
    const pdfPath = path.join(__dirname, 'pdfs', 'i-130.pdf');
    console.log('📄 Loading PDF from:', pdfPath);
    
    const existingPdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\n✅ Found ${fields.length} form fields in I-130.pdf:\n`);
    console.log('═══════════════════════════════════════════════════════\n');

    fields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name;
      console.log(`${index + 1}. "${name}" (${type})`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`\nTotal fields: ${fields.length}`);
    
    // Save to file for easy viewing
    const fieldList = fields.map((f, i) => `${i + 1}. "${f.getName()}" (${f.constructor.name})`).join('\n');
    await fs.writeFile('i-130-field-names.txt', fieldList);
    console.log('\n✅ Field list saved to: i-130-field-names.txt');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listPdfFields();
