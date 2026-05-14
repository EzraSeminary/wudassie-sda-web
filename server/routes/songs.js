import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import database from '../database/memoryDb.js';
import Song from '../models/Song.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /api/songs - Retrieve all songs with optional search and filters
router.get('/', [
  query('search').optional().isString().trim(),
  query('genre').optional().isString().trim(),
  query('year').optional().isNumeric(),
  query('artist').optional().isString().trim(),
], handleValidationErrors, (req, res) => {
  try {
    let songs;
    const { search, genre, year, artist } = req.query;

    if (search) {
      songs = database.searchSongs(search);
    } else if (genre || year || artist) {
      songs = database.filterSongs({ genre, year, artist });
    } else {
      songs = database.getAllSongs();
    }

    res.json({
      success: true,
      data: songs,
      count: songs.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve songs',
      message: error.message
    });
  }
});

// GET /api/songs/:id - Retrieve a specific song
router.get('/:id', [
  param('id').isString().notEmpty()
], handleValidationErrors, (req, res) => {
  try {
    const song = database.getSongById(req.params.id);
    
    if (!song) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    res.json({
      success: true,
      data: song
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve song',
      message: error.message
    });
  }
});

// POST /api/songs - Add a new song
router.post('/', requireAuth, [
  body('title').isString().trim().notEmpty().withMessage('Title is required'),
  body('artist').isString().trim().notEmpty().withMessage('Artist is required'),
  body('album').isString().trim().notEmpty().withMessage('Album is required'),
  body('genre').isString().trim().notEmpty().withMessage('Genre is required'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Valid year is required'),
  body('duration').isInt({ min: 1 }).withMessage('Valid duration is required'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5')
], handleValidationErrors, (req, res) => {
  try {
    const songData = req.body;
    const validationErrors = Song.validate(songData);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const song = database.createSong(songData);
    
    res.status(201).json({
      success: true,
      message: 'Song created successfully',
      data: song
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create song',
      message: error.message
    });
  }
});

// PUT /api/songs/:id - Update an existing song
router.put('/:id', requireAuth, [
  param('id').isString().notEmpty(),
  body('title').optional().isString().trim().notEmpty(),
  body('artist').optional().isString().trim().notEmpty(),
  body('album').optional().isString().trim().notEmpty(),
  body('genre').optional().isString().trim().notEmpty(),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() }),
  body('duration').optional().isInt({ min: 1 }),
  body('rating').optional().isFloat({ min: 0, max: 5 })
], handleValidationErrors, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingSong = database.getSongById(id);
    if (!existingSong) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    const validationErrors = Song.validate({ ...existingSong, ...updateData });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const updatedSong = database.updateSong(id, updateData);
    
    res.json({
      success: true,
      message: 'Song updated successfully',
      data: updatedSong
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update song',
      message: error.message
    });
  }
});

// DELETE /api/songs/:id - Delete a song
router.delete('/:id', requireAuth, [
  param('id').isString().notEmpty()
], handleValidationErrors, (req, res) => {
  try {
    const { id } = req.params;
    const deletedSong = database.deleteSong(id);
    
    if (!deletedSong) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    res.json({
      success: true,
      message: 'Song deleted successfully',
      data: deletedSong
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete song',
      message: error.message
    });
  }
});

export default router;