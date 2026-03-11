const express = require('express')
const jsonServer = require('json-server')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3001

// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
const uploadDir = path.join(__dirname, 'public', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// ตั้งค่า Multer สำหรับ upload ไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueName + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|webm|ogg|mov/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = allowed.test(file.mimetype.split('/')[1])
    if (ext || mime) { cb(null, true) }
    else { cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพและวีดีโอ')) }
  }
})

// API อัพโหลดไฟล์
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์' })
  const fileUrl = `/uploads/${req.file.filename}`
  const isVideo = /mp4|webm|ogg|mov/.test(req.file.originalname.toLowerCase())
  res.json({ url: fileUrl, filename: req.file.filename, originalName: req.file.originalname, type: isVideo ? 'video' : 'image', size: req.file.size })
})

// Serve uploaded files
app.use('/uploads', express.static(uploadDir))

// JSON Server
const router = jsonServer.router('db.json')
app.use(jsonServer.defaults({ noCors: false }))
app.use(router)

app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`)
  console.log(`📁 Upload: POST http://localhost:${PORT}/upload`)
})
