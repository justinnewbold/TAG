// SMS service using Twilio
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in environment

let twilioClient = null;
let fromNumber = null;

// Initialize SMS service
export async function initSMS() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('SMS service not configured - set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    return false;
  }

  try {
    const twilio = await import('twilio');
    twilioClient = twilio.default(accountSid, authToken);
    console.log('SMS service initialized (Twilio)');
    return true;
  } catch (error) {
    console.log('Twilio not available:', error.message);
    return false;
  }
}

// Send verification SMS
export async function sendVerificationSMS(to, code) {
  const message = `Your TAG! verification code is: ${code}\n\nThis code expires in 10 minutes.`;
  return sendSMS(to, message);
}

// Send password reset SMS
export async function sendPasswordResetSMS(to, code) {
  const message = `Your TAG! password reset code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, please secure your account.`;
  return sendSMS(to, message);
}

// Send login alert SMS
export async function sendLoginAlertSMS(to, location) {
  const message = `New login to your TAG! account${location ? ` from ${location}` : ''}. If this wasn't you, please secure your account.`;
  return sendSMS(to, message);
}

// Generic send SMS function
async function sendSMS(to, body) {
  if (!twilioClient) {
    console.log('SMS not configured, would send to:', to);
    console.log('Message:', body);
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    // Normalize phone number (ensure it starts with +)
    const normalizedTo = to.startsWith('+') ? to : `+${to}`;

    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: normalizedTo,
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
}

// Validate phone number format
export function isValidPhoneNumber(phone) {
  // Basic E.164 format validation
  const e164Regex = /^\+?[1-9]\d{6,14}$/;
  return e164Regex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Normalize phone number to E.164 format
export function normalizePhoneNumber(phone) {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    // Assume US number if no country code
    if (normalized.length === 10) {
      normalized = '+1' + normalized;
    } else {
      normalized = '+' + normalized;
    }
  }

  return normalized;
}

export const sms = {
  init: initSMS,
  sendVerification: sendVerificationSMS,
  sendPasswordReset: sendPasswordResetSMS,
  sendLoginAlert: sendLoginAlertSMS,
  isConfigured: () => twilioClient !== null,
  isValidPhone: isValidPhoneNumber,
  normalizePhone: normalizePhoneNumber,
};
