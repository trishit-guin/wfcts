const { createWorker } = require('tesseract.js')
const pdfParse = require('pdf-parse')

async function extractTextFromImage(buffer) {
  const worker = await createWorker('eng')
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '6',   // PSM_SINGLE_BLOCK — best for structured tables
      preserve_interword_spaces: '1', // keeps column spacing intact
    })
    const { data: { text } } = await worker.recognize(buffer)
    return text
  } finally {
    await worker.terminate()
  }
}

async function extractTextFromPDF(buffer) {
  const data = await pdfParse(buffer)
  return data.text
}

async function extractText(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer)
  }
  // All image types go through Tesseract
  return extractTextFromImage(buffer)
}

module.exports = { extractText }
