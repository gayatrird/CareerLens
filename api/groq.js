export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: { message: `Method ${req.method} Not Allowed. Only POST requests are accepted.` }
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'Server configuration error: GROQ_API_KEY is not set on the server.' }
    });
  }

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: payload,
    });

    // Forward rate-limit retry header if present
    const retryAfter = groqResponse.headers.get('retry-after');
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }

    const text = await groqResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text } };
    }

    return res.status(groqResponse.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: {
        message: 'Failed to communicate with Groq AI service.',
        details: error?.message || 'Unknown server error',
      }
    });
  }
}
