// Email service using Resend (or SendGrid fallback)
// Set RESEND_API_KEY or SENDGRID_API_KEY in environment

let emailClient = null;
let emailProvider = null;

// Initialize email service
export async function initEmail() {
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      emailClient = new Resend(process.env.RESEND_API_KEY);
      emailProvider = 'resend';
      console.log('Email service initialized (Resend)');
      return true;
    } catch (error) {
      console.log('Resend not available:', error.message);
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
      emailClient = sgMail.default;
      emailProvider = 'sendgrid';
      console.log('Email service initialized (SendGrid)');
      return true;
    } catch (error) {
      console.log('SendGrid not available:', error.message);
    }
  }

  console.log('Email service not configured - set RESEND_API_KEY or SENDGRID_API_KEY');
  return false;
}

// Send verification email
export async function sendVerificationEmail(to, code, name) {
  const subject = 'Verify your TAG! account';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .logo { font-size: 48px; text-align: center; margin-bottom: 20px; }
        h1 { color: #333; text-align: center; margin-bottom: 10px; }
        .code { font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #4F46E5; background: #EEF2FF; padding: 20px; border-radius: 12px; margin: 30px 0; }
        p { color: #666; line-height: 1.6; text-align: center; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏃‍♂️</div>
        <h1>Welcome to TAG!</h1>
        <p>Hey ${name || 'there'}! Use this code to verify your email:</p>
        <div class="code">${code}</div>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <div class="footer">TAG! - The GPS Chase Game</div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

// Send password reset email
export async function sendPasswordResetEmail(to, code, name) {
  const subject = 'Reset your TAG! password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .logo { font-size: 48px; text-align: center; margin-bottom: 20px; }
        h1 { color: #333; text-align: center; margin-bottom: 10px; }
        .code { font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #DC2626; background: #FEF2F2; padding: 20px; border-radius: 12px; margin: 30px 0; }
        p { color: #666; line-height: 1.6; text-align: center; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🔐</div>
        <h1>Password Reset</h1>
        <p>Hey ${name || 'there'}! Use this code to reset your password:</p>
        <div class="code">${code}</div>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please secure your account.</p>
        <div class="footer">TAG! - The GPS Chase Game</div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

// Send magic link email
export async function sendMagicLinkEmail(to, link, name) {
  const subject = 'Sign in to TAG!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .logo { font-size: 48px; text-align: center; margin-bottom: 20px; }
        h1 { color: #333; text-align: center; margin-bottom: 10px; }
        .button { display: block; width: 200px; margin: 30px auto; padding: 16px 32px; background: #4F46E5; color: white; text-decoration: none; text-align: center; border-radius: 12px; font-weight: bold; }
        p { color: #666; line-height: 1.6; text-align: center; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">✨</div>
        <h1>Sign In</h1>
        <p>Hey ${name || 'there'}! Click the button below to sign in:</p>
        <a href="${link}" class="button">Sign In to TAG!</a>
        <p>This link expires in 10 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <div class="footer">TAG! - The GPS Chase Game</div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

// Generic send email function
async function sendEmail(to, subject, html) {
  if (!emailClient) {
    console.log('Email not configured, would send to:', to);
    console.log('Subject:', subject);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const fromEmail = process.env.EMAIL_FROM || 'TAG! <noreply@tag-game.app>';

    if (emailProvider === 'resend') {
      const { data, error } = await emailClient.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
      });
      if (error) {
        console.error('Resend error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, id: data?.id };
    }

    if (emailProvider === 'sendgrid') {
      await emailClient.send({
        to,
        from: fromEmail,
        subject,
        html,
      });
      return { success: true };
    }

    return { success: false, error: 'Unknown email provider' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

export const email = {
  init: initEmail,
  sendVerification: sendVerificationEmail,
  sendPasswordReset: sendPasswordResetEmail,
  sendMagicLink: sendMagicLinkEmail,
  isConfigured: () => emailClient !== null,
};
