import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is missing. Set it in your .env file (see .env.example).');
}

export { OPENROUTER_API_KEY };
