import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from '../parsers/csvParser';
import * as repo from '../repositories/payrollRepository';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Use multipart field "file".' });
    return;
  }
  if (!req.file.originalname.endsWith('.csv')) {
    res.status(400).json({ error: 'File must be a .csv' });
    return;
  }

  try {
    const records = parse(req.file.buffer);
    repo.load(records);
    res.json({ loaded: records.length });
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

export default router;
