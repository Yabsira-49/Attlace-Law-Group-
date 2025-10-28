/**
 * PDF FIELD EXTRACTOR
 * Extracts field names from USCIS PDF forms
 * Run this to get the REAL field names for mapping
 * Path: C:\Users\49\uscis-multi-role-app\backend\listPdfFields.js
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function listPdfFields(pdfPath) {
    try {
        console.log(`\n📄 Analyzing PDF: ${pdfPath}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Load PDF
        const existingPdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        // Get all fields
        const fields = form.getFields();

        console.log(`Found ${fields.length} fields:\n`);

        // List all field names and types
        fields.forEach((field, index) => {
            const name = field.getName();
            const type = field.constructor.name;

            console.log(`${index + 1}. ${name}`);
            console.log(`   Type: ${type}`);
            console.log('');
        });

        // Save to file
        const outputPath = pdfPath.replace('.pdf', '_fields.txt');
        const output = fields.map((field, index) => {
            return `${index + 1}. ${field.getName()} (${field.constructor.name})`;
        }).join('\n');

        await fs.writeFile(outputPath, output);
        console.log(`\n✅ Field list saved to: ${outputPath}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node listPdfFields.js <pdf-file>');
        console.log('Example: node listPdfFields.js pdfs/i-130.pdf');
        process.exit(1);
    }

    const pdfPath = path.resolve(args[0]);
    await listPdfFields(pdfPath);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { listPdfFields };
