import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authRequired } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
    cb(null, name)
  },
})

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const ok = ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)
    cb(null, ok)
  },
})

const router = Router()

router.post('/', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, msg: '请选择 5MB 以内的图片' })
  try {
    const inputPath = req.file.path
    const ext = path.extname(req.file.filename)
    const nameWithoutExt = path.basename(req.file.filename, ext)
    const outputFilename = nameWithoutExt + '.jpg'
    const outputPath = path.join(path.dirname(inputPath), outputFilename)

    await sharp(inputPath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outputPath)

    if (ext.toLowerCase() !== '.jpg') {
      fs.unlink(inputPath, () => {})
    }

    res.json({ ok: true, url: '/uploads/' + outputFilename })
  } catch (e) {
    console.error('Image processing error:', e.message)
    // 处理失败时删除可能损坏的临时文件，避免留下垃圾
    fs.unlink(req.file.path, () => {})
    res.status(400).json({ ok: false, msg: '图片处理失败，请换一张试试' })
  }
})

export default router
