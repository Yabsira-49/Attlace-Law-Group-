/**
 * PDF CONTROLLER - COMPLETE VERSION WITH NESTED DATA SUPPORT
 * Fills USCIS PDF forms with user data
 * Creates 100% identical PDFs to official USCIS forms
 * Path: C:\Users\49\uscis-multi-role-app\backend\controllers\pdfController.js
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// PDF field mappings (we'll import these)
const pdfMaps = require('../utils/pdfMaps');

/**
 * Flatten nested object to dot notation
 * Example: {petitionerInfo: {lastName: "Smith"}} => {petitionerInfoLastName: "Smith"}
 */
function flattenObject(obj, prefix = '') {
  let flattened = {};
  
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? prefix + key.charAt(0).toUpperCase() + key.slice(1) : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

/**
 * Fill PDF form with user data
 * @param {string} formType - Form type (I-130, I-485, etc.)
 * @param {object} formData - User's form data (can be nested)
 * @returns {Buffer} - Filled PDF as buffer
 */
async function fillPdfForm(formType, formData) {
  try {
    // Load the blank PDF template
    const pdfPath = path.join(__dirname, '../pdfs', formType.toLowerCase() + '.pdf');
    const existingPdfBytes = await fs.readFile(pdfPath);

    // Load PDF document
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the form from the PDF
    const form = pdfDoc.getForm();

    // Get field mapping for this form type
    const fieldMap = pdfMaps[formType];

    if (!fieldMap) {
      console.warn('⚠️ No field mapping found for form type:', formType);
      // Return PDF without filling if no mapping exists
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    }

    // Flatten nested form data
    const flattenedData = flattenObject(formData);
    console.log('📊 Flattened form data:', JSON.stringify(flattenedData, null, 2));

    let fieldsFilledCount = 0;
    let fieldsNotFoundCount = 0;

    // Fill each field according to the mapping
    Object.keys(fieldMap).forEach(userFieldName => {
      const pdfFieldName = fieldMap[userFieldName];
      const value = flattenedData[userFieldName];

      if (value !== undefined && value !== null && value !== '') {
        try {
          const field = form.getField(pdfFieldName);

          // Handle different field types
          const fieldType = field.constructor.name;

          if (fieldType === 'PDFTextField') {
            field.setText(String(value));
            fieldsFilledCount++;
            console.log(`✅ Filled text field: ${userFieldName} = "${value}"`);
          } else if (fieldType === 'PDFCheckBox') {
            if (value === true || value === 'true' || value === 'yes' || value === '1') {
              field.check();
              fieldsFilledCount++;
              console.log(`✅ Checked box: ${userFieldName}`);
            }
          } else if (fieldType === 'PDFRadioGroup') {
            field.select(String(value));
            fieldsFilledCount++;
            console.log(`✅ Selected radio: ${userFieldName} = "${value}"`);
          }
        } catch (fieldError) {
          // Field might not exist in PDF, log but continue
          fieldsNotFoundCount++;
          console.warn(`⚠️ Field not found in PDF: ${pdfFieldName} (${userFieldName})`);
        }
      }
    });

    console.log(`\n📊 PDF Fill Summary:`);
    console.log(`   ✅ Fields filled: ${fieldsFilledCount}`);
    console.log(`   ⚠️  Fields not found: ${fieldsNotFoundCount}`);

    // Flatten the form to prevent further editing
    form.flatten();

    // Save the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error('❌ Error filling PDF:', error);
    throw error;
  }
}

/**
 * Generate and save PDF for form submission
 * POST /api/user/forms/:id/generate-pdf
 */
async function generatePdf(req, res) {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get form submission
    const result = await pool.query(
      'SELECT * FROM form_submissions WHERE id = $1 AND user_id = $2 AND payment_status = $3',
      [id, user_id, 'completed']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form submission not found or payment not completed'
      });
    }

    const submission = result.rows[0];

    // Check if PDF already exists
    if (submission.pdf_path) {
      const pdfPath = path.join(__dirname, '..', submission.pdf_path);
      try {
        await fs.access(pdfPath);
        return res.json({
          success: true,
          message: 'PDF already generated',
          pdf_path: submission.pdf_path
        });
      } catch (err) {
        // PDF file doesn't exist, continue to generate
      }
    }

    // Generate PDF
    const pdfBytes = await fillPdfForm(submission.form_type, submission.form_data);

    // Create generated-pdfs directory if it doesn't exist
    const outputDir = path.join(__dirname, '../generated-pdfs');
    await fs.mkdir(outputDir, { recursive: true });

    // Save PDF file
    const filename = submission.form_type + '_' + submission.id + '_' + Date.now() + '.pdf';
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, pdfBytes);

    // Update database with PDF path
    const relativePath = 'generated-pdfs/' + filename;
    await pool.query(
      'UPDATE form_submissions SET pdf_path = $1 WHERE id = $2',
      [relativePath, id]
    );

    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdf_path: relativePath
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF: ' + error.message
    });
  }
}

/**
 * Download PDF
 * GET /api/user/forms/:id/download
 */
async function downloadPdf(req, res) {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get form submission
    const result = await pool.query(
      'SELECT * FROM form_submissions WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form submission not found'
      });
    }

    const submission = result.rows[0];

    if (!submission.pdf_path) {
      return res.status(400).json({
        success: false,
        error: 'PDF not generated yet'
      });
    }

    const pdfPath = path.join(__dirname, '..', submission.pdf_path);

    // Check if file exists
    try {
      await fs.access(pdfPath);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }

    // Send file
    const downloadName = submission.form_type + '_filled.pdf';
    res.download(pdfPath, downloadName);

  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF'
    });
  }
}

/**
 * TEST ENDPOINT - Generate PDF without payment check
 * POST /api/user/forms/:id/generate-pdf-test
 * ⚠️ For testing only - bypasses payment validation
 */
async function generatePdfTest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get submission WITHOUT payment check (for testing)
    const result = await pool.query(
      `SELECT * FROM form_submissions 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'Form submission not found'
      });
    }

    const submission = result.rows[0];
    console.log('📄 Generating PDF for submission:', id);
    console.log('📋 Form Type:', submission.form_type);
    console.log('💾 Form Data (nested):', JSON.stringify(submission.form_data, null, 2));

    // Generate PDF using the fillPdfForm function
    const pdfBuffer = await fillPdfForm(
      submission.form_type,
      submission.form_data
    );

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!require('fs').existsSync(uploadsDir)) {
      require('fs').mkdirSync(uploadsDir, { recursive: true });
    }

    // Save PDF to file
    const fileName = `${submission.form_type}-filled-${id}-${Date.now()}.pdf`;
    const pdfPath = path.join(uploadsDir, fileName);
    await fs.writeFile(pdfPath, pdfBuffer);

    // Update database with PDF path
    await pool.query(
      'UPDATE form_submissions SET pdf_path = $1 WHERE id = $2',
      [`uploads/${fileName}`, id]
    );

    console.log('✅ PDF generated successfully:', fileName);

    res.json({
      success: true,
      message: 'PDF generated successfully (TEST MODE - no payment required)',
      pdfPath: `uploads/${fileName}`,
      fileName: fileName,
      formType: submission.form_type,
      note: '⚠️ This is a test endpoint. In production, payment must be completed first.'
    });

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}

/**
 * TEST ENDPOINT - Download PDF
 * GET /api/user/forms/:id/download-test
 * Downloads the generated PDF file
 */
async function downloadPdfTest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get submission
    const result = await pool.query(
      `SELECT * FROM form_submissions 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'Form submission not found'
      });
    }

    const submission = result.rows[0];

    if (!submission.pdf_path) {
      return res.status(400).json({
        success: false,
        error: 'PDF not generated yet. Please generate PDF first.'
      });
    }

    // Get full path
    const pdfPath = path.join(__dirname, '..', submission.pdf_path);
    
    // Check if file exists
    if (!require('fs').existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }

    // Send file
    const fileName = path.basename(submission.pdf_path);
    res.download(pdfPath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          error: 'Error downloading PDF'
        });
      }
    });

  } catch (error) {
    console.error('❌ PDF download error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ✅ Export all functions including test endpoints
module.exports = {
  fillPdfForm,
  generatePdf,
  downloadPdf,
  generatePdfTest,
  downloadPdfTest
};
