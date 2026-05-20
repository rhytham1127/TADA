const express = require('express');
const router = express.Router();
const { uploadFiles, getFiles, deleteFile, downloadFile } = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../utils/fileUpload');

// All routes are protected
router.use(authenticateToken);

// IMPORTANT: specific routes must come BEFORE parameterized routes
router.get('/download/:fileId', downloadFile);   // must be before /:claimId
router.post('/:claimId', upload.array('files', 10), uploadFiles);
router.get('/:claimId', getFiles);
router.delete('/:fileId', deleteFile);

module.exports = router;
