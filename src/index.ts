import express from 'express';
import uploadRouter from './routes/upload';
import summaryRouter from './routes/summary';
import employeesRouter from './routes/employees';
import anomaliesRouter from './routes/anomalies';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use('/api/upload', uploadRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/anomalies', anomaliesRouter);

app.listen(PORT, () => {
  console.log(`Payroll API running on http://localhost:${PORT}`);
  console.log('POST /api/upload  — upload a payroll CSV');
  console.log('GET  /api/summary — dataset overview');
  console.log('GET  /api/employees — per-employee stats');
  console.log('GET  /api/anomalies — flagged anomalies');
});
