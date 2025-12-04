import express from 'express';
import multer from 'multer';
import { uploadExcelAndSuggest } from '../controllers/excelController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload-excel', upload.single('file'), uploadExcelAndSuggest);

export default router;
