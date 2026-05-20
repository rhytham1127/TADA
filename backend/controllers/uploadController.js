const db = require('../db');
const fs = require('fs');
require('dotenv').config();

// Upload files
const uploadFiles = async (req, res) => {
  try {
    const { claimId } = req.params;
    const userId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Verify claim ownership
    const claimResult = await db.query(
      'SELECT * FROM tada_claims WHERE id = $1 AND user_id = $2',
      [claimId, userId]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'TADA claim not found' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const result = await db.query(
        `INSERT INTO claim_documents (claim_id, file_name, file_path, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          claimId,
          file.originalname,
          file.path,
          file.mimetype,
          file.size
        ]
      );
      uploadedFiles.push(result.rows[0]);
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};

// Get uploaded files
const getFiles = async (req, res) => {
  try {
    const { claimId } = req.params;
    const userId = req.user.id;

    // Verify claim ownership
    const claimResult = await db.query(
      'SELECT * FROM tada_claims WHERE id = $1 AND user_id = $2',
      [claimId, userId]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'TADA claim not found' });
    }

    const result = await db.query(
      'SELECT id, file_name, file_path, file_type, file_size, uploaded_at FROM claim_documents WHERE claim_id = $1 ORDER BY uploaded_at DESC',
      [claimId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Get file info and verify ownership
    const fileResult = await db.query(
      `SELECT d.*
       FROM claim_documents d
       JOIN tada_claims c ON d.claim_id = c.id
       WHERE d.id = $1 AND c.user_id = $2`,
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Delete from filesystem
    if (file.file_path && fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // Delete from database
    await db.query('DELETE FROM claim_documents WHERE id = $1', [fileId]);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

// Download file
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Get file info and verify ownership
    const fileResult = await db.query(
      `SELECT d.*
       FROM claim_documents d
       JOIN tada_claims c ON d.claim_id = c.id
       WHERE d.id = $1 AND c.user_id = $2`,
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    if (!file.file_path || !fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(file.file_path, file.file_name);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

module.exports = { uploadFiles, getFiles, deleteFile, downloadFile };

