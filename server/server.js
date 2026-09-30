require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health endpoint — visiting http://localhost:3001 will show this message
app.get('/', (req, res) => {
  res.send('<h1>Veritas Lead API</h1><p>Use POST /api/lead to submit a lead (multipart/form-data supported).</p>');
});

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.post('/api/lead', upload.single('upload'), async (req, res) => {
  try {
    const { fname, lname, phone, email, msg } = req.body;

    // build email body
    const text = `New lead from website:\n\nName: ${fname} ${lname}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${msg}`;

    // For testing: prefer Ethereal unless SMTP is explicitly configured and NODE_ENV=production
    let transporter;
    let testAccount;
    const useEthereal = !(process.env.SMTP_HOST && process.env.SMTP_USER) || process.env.FORCE_ETHEREAL === 'true' || process.env.NODE_ENV !== 'production';
    if (!useEthereal) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // create a test account and transporter
      testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Using Ethereal test account for sending —', testAccount.user);
    }

    // Ensure valid from/to for testing. Use configured values when present, otherwise fallbacks.
    const fromAddr = process.env.EMAIL_FROM || (testAccount && testAccount.user) || 'no-reply@veritas.example.com';
    const toAddr = process.env.EMAIL_TO || email || (testAccount && testAccount.user) || process.env.SMTP_USER || fromAddr;

    const mailOptions = {
      from: fromAddr,
      to: toAddr,
      subject: `Website lead: ${fname} ${lname}`,
      text,
      attachments: []
    };

    if (req.file) {
      mailOptions.attachments.push({
        filename: req.file.originalname,
        path: req.file.path
      });
    }

    // Save lead locally as a backup
    try {
      const leadsFile = path.join(__dirname, 'leads.json');
      let leads = [];
      if (fs.existsSync(leadsFile)) {
        const raw = fs.readFileSync(leadsFile, 'utf8') || '[]';
        leads = JSON.parse(raw || '[]');
      }
      const leadEntry = {
        ts: new Date().toISOString(),
        fname,
        lname,
        phone,
        email,
        msg,
        attachment: req.file ? { originalname: req.file.originalname, path: req.file.path } : null
      };
      leads.push(leadEntry);
      fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));
    } catch (err) {
      console.error('Failed to save lead locally:', err);
    }

    console.log('mailOptions before send:', mailOptions);
    console.log('mailOptions.from:', mailOptions.from, 'mailOptions.to:', mailOptions.to);
    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal, log a preview URL
    try{
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if(previewUrl) console.log('Message preview URL:', previewUrl);
    }catch(e){/* ignore */}

    // cleanup uploaded file after sending
    if (req.file) {
      fs.unlink(req.file.path, (err) => { if (err) console.error('unlink error', err); });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
