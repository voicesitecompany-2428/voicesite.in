import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('Warning: OPENAI_API_KEY is not set. AI features will not work.');
}

export const openai = new OpenAI({
  apiKey: apiKey || '',
});

// System prompt for extracting structured data from transcription
export const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction assistant. Extract structured information from the following shop/business description. The input may be in Hindi, Tamil, English, or any other language - but you MUST output everything in ENGLISH only.

Return ONLY valid JSON with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "shopName": "string (the name of the shop/business, translated to English)",
  "description": "string (2-3 sentences about the shop in English)",
  "products": [
    { "name": "string (product name in English)", "price": number, "description": "string (optional, in English)" }
  ],
  "timings": "string (business hours in English, e.g., '9 AM - 9 PM')",
  "location": "string (address or area in English)",
  "contact": {
    "phone": "string (optional)",
    "whatsapp": "string (optional)",
    "email": "string (optional)"
  }
}

Rules:
- ALWAYS output in English, even if input is in Hindi, Tamil, or other languages
- Translate product names to English (e.g., "आलू" → "Potato", "தக்காளி" → "Tomato")
- Keep shop names as-is if they are proper nouns, but transliterate if needed
- If any field is not mentioned, use null for strings or empty array for products
- Convert regional numbers to digits
- Prices should be numbers only (no currency symbols)
- If timings are mentioned in any language, convert to standard English format`;

// Context-specific prompts
const DETAILS_EXTRACTION_PROMPT = `Extract shop details from the transcription. The input may be in Hindi, Tamil, English, or other languages - output in ENGLISH.

Return ONLY valid JSON:
{
  "description": "string (2-3 sentences about the shop)",
  "location": "string (address or area)",
  "phone": "string (phone number if mentioned)",
  "timings": "string (business hours if mentioned)"
}

Rules:
- Keep the description concise but informative
- Extract any address, area, or location mentioned
- Extract phone numbers in standard format
- If not mentioned, use null`;

const PRODUCT_EXTRACTION_PROMPT = `Extract product information from the transcription. The input may be in Hindi, Tamil, English, or other languages - output in ENGLISH.

Return ONLY valid JSON:
{
  "product": {
    "name": "string (product name in English)",
    "price": number (price as a number, no currency symbol),
    "description": "string (brief description)"
  }
}

Rules:
- Translate product names to English
- Extract price as a number only
- Create a brief, appealing description
- If price not mentioned, use 0`;

const NAME_EXTRACTION_PROMPT = `You are a transliteration expert for Indian languages. Extract and transliterate the shop/business name from the transcription to English.

IMPORTANT: The input text is a phonetic transcription from speech, which may contain errors. Use your knowledge of Indian languages to infer the correct proper noun.

Return ONLY valid JSON:
{
  "shopName": "string (the shop name properly transliterated to English)"
}

Transliteration Rules:
1. Preserve the SOUND of proper nouns accurately:
   - "வைகை" / "वैगई" / phonetic "vaigai/waigai" → "Vaigai" (a river name in Tamil Nadu)
   - Do NOT misinterpret as "Wahi Gayi" or similar
   
2. Common Tamil/Hindi words to translate:
   - கடை/दुकान → Shop/Store
   - ஷாப் → Shop
   - ட்ரேடர்ஸ் → Traders
   - ஸ்டோர் → Store
   
3. If it sounds like a place name (river, city), use the standard English spelling:
   - Vaigai, Cauvery, Krishna, Ganga, Chennai, Mumbai, etc.

4. Keep the name professional and clean (capitalize properly)

Examples:
- "வைகை ட்ரேடர்ஸ்" or "vaigai traders" → "Vaigai Traders"
- "ராம் ஸ்டோர்" → "Ram Store"
- "कृष्णा शॉप" → "Krishna Shop"`;

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    // Auto-detect language (supports Hindi, English, and many more)
  });

  return transcription.text;
}

export async function extractShopData(transcription: string): Promise<Record<string, unknown>> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: transcription }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

export async function extractByContext(
  transcription: string,
  context: 'name' | 'details' | 'product'
): Promise<Record<string, unknown>> {
  // Select the appropriate prompt based on context
  let prompt: string;
  if (context === 'name') {
    prompt = NAME_EXTRACTION_PROMPT;
  } else if (context === 'details') {
    prompt = DETAILS_EXTRACTION_PROMPT;
  } else {
    prompt = PRODUCT_EXTRACTION_PROMPT;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: transcription }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

