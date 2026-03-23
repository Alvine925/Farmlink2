import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import fs from 'fs';

// Dynamically import Brevo to handle potential ESM/CJS issues and avoid type errors
let Brevo: any;
import('@getbrevo/brevo').then(m => {
  Brevo = m;
}).catch(e => {
  console.error('Failed to load Brevo SDK:', e);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly log .env file existence
const envPath = path.resolve(process.cwd(), '.env');
console.log('Checking for .env file at:', envPath);
if (fs.existsSync(envPath)) {
  console.log('.env file found. Size:', fs.statSync(envPath).size, 'bytes');
} else {
  console.error('.env file NOT found at:', envPath);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email Configuration (Dynamic Initialization)
  let apiInstance: any;
  let resend: Resend | null = null;

  const initializeEmailServices = async () => {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const resendApiKey = process.env.RESEND_API_KEY?.trim();

    if (resendApiKey && !resend) {
      try {
        resend = new Resend(resendApiKey);
        console.log('Resend API initialized successfully');
      } catch (e) {
        console.error('Failed to initialize Resend:', e);
      }
    }

    if (apiKey && !apiInstance) {
      try {
        // Standard Brevo v5 initialization
        const ApiClass = Brevo?.TransactionalEmailsApi || Brevo?.default?.TransactionalEmailsApi;
        const ApiKeys = Brevo?.TransactionalEmailsApiApiKeys || Brevo?.default?.TransactionalEmailsApiApiKeys;
        
        if (ApiClass) {
          apiInstance = new ApiClass();
          if (ApiKeys) {
            apiInstance.setApiKey(ApiKeys.apiKey, apiKey);
          } else {
            apiInstance.setApiKey(0, apiKey);
          }
          console.log('Brevo API initialized successfully');
        } else {
          // If Brevo is not yet loaded, try to import it now
          const BrevoModule: any = await import('@getbrevo/brevo');
          const DynamicApiClass = BrevoModule.TransactionalEmailsApi || BrevoModule.default?.TransactionalEmailsApi;
          const DynamicApiKeys = BrevoModule.TransactionalEmailsApiApiKeys || BrevoModule.default?.TransactionalEmailsApiApiKeys;
          
          if (DynamicApiClass) {
            apiInstance = new DynamicApiClass();
            if (DynamicApiKeys) {
              apiInstance.setApiKey(DynamicApiKeys.apiKey, apiKey);
            } else {
              apiInstance.setApiKey(0, apiKey);
            }
            console.log('Brevo API initialized successfully (dynamic)');
          }
        }
      } catch (e) {
        console.error('Brevo initialization failed:', e);
      }
    }
    
    return { apiKey, resendApiKey };
  };

  // Initial setup attempt
  await initializeEmailServices();

  // Email API Route
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, text, html } = req.body;
    
    // Refresh configuration on every request if not initialized
    const { apiKey, resendApiKey } = await initializeEmailServices();
    
    console.log(`[Email Request] Subject: "${subject}" To: ${to}`);
    
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.RESEND_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || process.env.RESEND_SENDER_NAME || 'AgriDirect';

    console.log(`[Email Diagnostics] BREVO_API_KEY: ${apiKey ? 'Present' : 'Missing'}, SENDER_EMAIL: ${senderEmail || 'Missing'}`);

    if (!senderEmail && !resend) {
      console.error('Email error: Sender email is not configured');
      return res.status(500).json({ 
        error: 'Sender email not configured', 
        details: 'Please set BREVO_SENDER_EMAIL in your secrets or .env file. It must be a verified sender in Brevo.' 
      });
    }

    // Try Resend first if configured
    if (resend) {
      try {
        console.log('Attempting to send via Resend...');
        const result = await resend.emails.send({
          from: `${senderName} <${senderEmail || 'onboarding@resend.dev'}>`,
          to: [to],
          subject: subject,
          text: text,
          html: html || `<p>${text}</p>`,
        });
        if (result.error) throw result.error;
        console.log('Email sent successfully via Resend:', result.data?.id);
        return res.json({ success: true, id: result.data?.id });
      } catch (error: any) {
        console.error('Resend failed:', error);
        if (!apiInstance) {
          return res.status(500).json({ error: 'Resend failed', details: error.message });
        }
        console.log('Falling back to Brevo...');
      }
    }

    // Fallback to Brevo
    if (apiKey && apiInstance) {
      const BrevoModule: any = Brevo?.default || Brevo || await import('@getbrevo/brevo');
      const SendSmtpEmailClass = BrevoModule.SendSmtpEmail || BrevoModule.default?.SendSmtpEmail;
      
      if (!SendSmtpEmailClass) {
        console.error('Brevo error: SendSmtpEmail class not found');
        return res.status(500).json({ error: 'Brevo configuration error', details: 'SendSmtpEmail class not found' });
      }

      const sendSmtpEmail = new SendSmtpEmailClass();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html || `<html><body><p>${text}</p></body></html>`;
      sendSmtpEmail.sender = { 
        name: senderName, 
        email: senderEmail 
      };
      sendSmtpEmail.to = [{ email: to }];

      try {
        console.log('Attempting to send via Brevo...');
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully via Brevo:', result.body || result);
        return res.json({ success: true, messageId: result.body?.messageId || result.messageId });
      } catch (error: any) {
        const errorDetails = error.response?.body || error.message || error;
        console.error('Brevo failed:', errorDetails);
        return res.status(500).json({ 
          error: 'Failed to send email via Brevo', 
          details: errorDetails 
        });
      }
    }

    console.error('Email error: No email service configured or initialized');
    const reason = !apiKey ? 'BREVO_API_KEY is missing' : !apiInstance ? 'Brevo API failed to initialize' : 'Unknown reason';
    return res.status(500).json({ 
      error: 'Email service not configured', 
      details: `Reason: ${reason}. Please check your secrets or .env file.`,
      diagnostics: {
        hasApiKey: !!apiKey,
        hasApiInstance: !!apiInstance,
        hasResend: !!resend,
        senderEmail: senderEmail || 'Missing',
        envKeys: Object.keys(process.env).filter(k => k.includes('BREVO') || k.includes('RESEND'))
      }
    });
  });

  // Diagnostic route to check environment variable keys
  app.get('/api/debug-env', (req, res) => {
    const keys = Object.keys(process.env).filter(k => 
      k.includes('BREVO') || k.includes('RESEND') || k.includes('GEMINI') || k.includes('VITE')
    );
    res.json({
      envKeys: keys,
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd(),
      envFileExists: fs.existsSync(path.resolve(process.cwd(), '.env'))
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
