// src/lib/sarvamVision.ts
// Converts a menu photo buffer to OCR text using GPT-4o-mini vision.
// Named sarvamVision.ts to avoid renaming the import in onboarding/complete.

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OCR_PROMPT =
    'Extract all text from this menu image. Preserve item names, prices, and section headings. Include every item visible in the image. Return plain text, no markdown formatting.';

/**
 * Converts a menu photo buffer to plain OCR text using GPT-4o-mini vision.
 * Returns an empty string if the call fails.
 */
export async function imageToMenuText(
    buffer: Buffer,
    mimeType: string
): Promise<string> {
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
                        { type: 'text', text: OCR_PROMPT },
                    ],
                },
            ],
            max_tokens: 2000,
        });

        const text = response.choices[0]?.message?.content ?? '';
        console.log(`[imageToMenuText] extracted ${text.length} chars from photo`);
        return text;
    } catch (err) {
        console.error('[imageToMenuText] GPT-4o-mini vision failed:', err);
        return '';
    }
}
