import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'hi' })
  .then(res => console.log('success'))
  .catch(e => console.log('error', e.message));
