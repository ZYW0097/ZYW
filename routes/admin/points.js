const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../../config/cloudinary');
const upload = multer({ storage });
const pointsController = require('../../controllers/admin/pointsController');


// 建立集點卡
router.post('/create', upload.any(), pointsController.createCard);

module.exports = router;