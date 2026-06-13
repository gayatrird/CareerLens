import https from 'https';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const apiKeyMatch = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);

if (!apiKeyMatch) {
  console.error("API key not found in .env");
  process.exit(1);
}

const apiKey = apiKeyMatch[1].trim();
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.models) {
        const generateModels = json.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        console.log("AVAILABLE MODELS FOR GENERATE_CONTENT:");
        generateModels.forEach(m => console.log(m.name));
      } else {
        console.error("Error fetching models:", json);
      }
    } catch (e) {
      console.error("Failed to parse response:", data);
    }
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
