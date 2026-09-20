import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;

  return {
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'local-groq-api-proxy',
        configureServer(server) {
          server.middlewares.use('/api/groq', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Allow', ['POST']);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: { message: `Method ${req.method} Not Allowed. Only POST is accepted.` } }));
              return;
            }

            if (!groqApiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: { message: 'GROQ_API_KEY is not configured in local .env file.' }
              }));
              return;
            }

            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }

            try {
              const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${groqApiKey}`,
                },
                body,
              });

              const retryAfter = groqResponse.headers.get('retry-after');
              if (retryAfter) {
                res.setHeader('Retry-After', retryAfter);
              }

              res.statusCode = groqResponse.status;
              res.setHeader('Content-Type', 'application/json');
              const data = await groqResponse.text();
              res.end(data);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: { message: 'Failed to communicate with Groq AI service.', details: err?.message || 'Proxy error' }
              }));
            }
          });
        }
      }
    ]
  };
});

