export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Telefonnummer fehlt' });
  }

  // Normalize: strip spaces/dashes, ensure +49 prefix
  let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+49' + normalized.slice(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+49' + normalized;
  }

  // Basic German number validation
  if (!/^\+49[1-9]\d{9,12}$/.test(normalized)) {
    return res.status(400).json({ error: 'Ungültige Telefonnummer' });
  }

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: process.env.VAPI_ASSISTANT_ID,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: normalized,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('VAPI error:', error);
      return res.status(500).json({ error: 'Anruf konnte nicht gestartet werden' });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, callId: data.id });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
