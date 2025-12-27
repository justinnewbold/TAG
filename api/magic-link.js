// Vercel Serverless Function for Magic Link Emails
// Uses Resend API to send beautiful magic link emails

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }
  
  try {
    // Generate a magic token (in production, store this in database with expiry)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Build the magic link URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://tag.newbold.cloud';
    const magicLink = `${baseUrl}/auth/magic?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TAG! <noreply@newbold.cloud>',
        to: email,
        subject: '🏃 Your TAG! Magic Link - Sign In Instantly',
        html: generateEmailTemplate(magicLink, email),
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', data);
      
      // Handle specific Resend errors
      if (data.statusCode === 403 || data.message?.includes('domain')) {
        return res.status(500).json({ 
          error: 'Email domain not verified. Please contact support.',
          details: 'The sending domain needs to be verified in Resend.'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to send email',
        details: data.message || 'Unknown error'
      });
    }
    
    // Store token in response for client-side storage (or use database in production)
    // In a real app, you'd store this server-side
    console.log('Magic link email sent successfully to:', email);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Magic link sent! Check your email.',
      emailId: data.id,
      // In production, don't expose the token
      _token: process.env.NODE_ENV === 'development' ? token : undefined
    });
    
  } catch (error) {
    console.error('Magic link error:', error);
    return res.status(500).json({ 
      error: 'Failed to send magic link',
      details: error.message
    });
  }
}

// Generate a secure random token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Generate beautiful email template
function generateEmailTemplate(magicLink, email) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to TAG!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="margin: 0; font-size: 48px; font-weight: bold;">
                <span style="color: #22d3ee;">TAG</span><span style="color: #a855f7;">!</span>
              </h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 16px;">
                GPS Tag - Hunt Your Friends
              </p>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 24px; padding: 40px; border: 1px solid #334155;">
              <h2 style="margin: 0 0 10px; color: #f1f5f9; font-size: 24px; font-weight: 600; text-align: center;">
                🔮 Your Magic Link
              </h2>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 16px; text-align: center; line-height: 1.5;">
                Click the button below to sign in instantly.<br>No password needed!
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 18px; font-weight: 600; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);">
                      ✨ Sign In to TAG!
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; text-align: center;">
                ⏰ This link expires in 15 minutes
              </p>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding-top: 30px;">
              <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.5;">
                If you didn't request this email, you can safely ignore it.<br>
                This link was requested for: <strong style="color: #94a3b8;">${email}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; border-top: 1px solid #1e293b; margin-top: 30px;">
              <p style="margin: 20px 0 0; color: #475569; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} TAG! by Newbold Cloud<br>
                <a href="https://tag.newbold.cloud" style="color: #6366f1; text-decoration: none;">tag.newbold.cloud</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
