const { v2: cloudinary } = require('cloudinary')

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function uploadOrderSampleImage(sampleImage) {
  if (!sampleImage || typeof sampleImage !== 'string') return sampleImage || ''
  if (!sampleImage.startsWith('data:image/')) return sampleImage
  if (!isConfigured) return sampleImage

  try {
    const result = await cloudinary.uploader.upload(sampleImage, {
      folder: 'ashok-tex/orders',
      resource_type: 'image',
    })
    return result.secure_url
  } catch (_) {
    return sampleImage
  }
}

async function uploadPayslipPdf(pdfBase64, fileName = 'payslip.pdf') {
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    throw new Error('PDF data is required')
  }
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured')
  }

  const publicId = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9-_]/g, '_')
  const dataUri = pdfBase64.startsWith('data:application/pdf')
    ? pdfBase64
    : `data:application/pdf;base64,${pdfBase64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'ashok-tex/payslips',
    resource_type: 'raw',
    format: 'pdf',
    public_id: publicId,
    overwrite: true,
    invalidate: true,
  })

  return result.secure_url
}

module.exports = {
  isCloudinaryConfigured: isConfigured,
  uploadOrderSampleImage,
  uploadPayslipPdf,
}
