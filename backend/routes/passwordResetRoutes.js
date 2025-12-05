import express from 'express';
import { sendPasswordResetEmail } from '../controllers/passwordResetController.js';

const router = express.Router();

// POST /api/password-reset/send
router.post('/send', sendPasswordResetEmail);

export default router;
