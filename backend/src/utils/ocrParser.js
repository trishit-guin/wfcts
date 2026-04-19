const { createWorker } = require('tesseract.js')
const pdfParse = require('pdf-parse')

async function extractTextFromImage(buffer) {
  const worker = await createWorker('eng')
  try {
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
