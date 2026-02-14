
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        console.log('Received voice processing request');
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;
        const siteType = formData.get('type') as string || 'Shop'; // Default to Shop if missing

        if (!audioFile) {
            console.error('No audio file found in request');
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }
        console.log('Audio file received:', audioFile.name, audioFile.size, audioFile.type);

        // 1. Transcribe with Sarvam AI
        const sarvamFormData = new FormData();
        sarvamFormData.append('file', audioFile);
        sarvamFormData.append('model', 'saaras:v2.5');

        console.log('Sending to Sarvam AI...');
        const sarvamResponse = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
            method: 'POST',
            headers: {
                'api-subscription-key': process.env.SARVAM_API_KEY || '',
            },
            body: sarvamFormData,
        });

        if (!sarvamResponse.ok) {
            const errorText = await sarvamResponse.text();
            console.error('Sarvam AI Error Status:', sarvamResponse.status);
            console.error('Sarvam AI Error Body:', errorText);
            return NextResponse.json({ error: `Sarvam AI Error: ${errorText}` }, { status: 500 });
        }

        const sarvamData = await sarvamResponse.json();
        const transcript = sarvamData.transcript;
        console.log('Sarvam Transcript:', transcript);

        if (!transcript) {
            console.error('No transcript returned from Sarvam AI');
            return NextResponse.json({ error: 'No transcript generated' }, { status: 500 });
        }

        // 2. Extract Data with GPT-4o-mini
        console.log('Sending to OpenAI with context:', siteType);

        let systemPrompt = '';

        if (siteType === 'Menu') {
            systemPrompt = `
    You are an AI assistant that extracts structured data for a RESTAURANT/CAFE MENU website from a voice transcript.
    Extract the following fields into a pure JSON object. Do not wrap in markdown code blocks.
    
    Required JSON Structure:
    {
      "name": "Restaurant/Cafe Name (string)",
      "owner_name": "Owner Name (string)",
      "contact_number": "Contact Number (string)",
      "timing": "Opening/Closing Timing (string)",
      "established_year": "Year Established (string) - leave empty if not mentioned",
      "location": "City/Location (string)",
      "state": "State (string)",
      "pincode": "Pincode (string)",
      "address": "Full Address (string)",
      "description": "A short, appetizing description (max 20 words) of the restaurant (string)",
      "products": []
    }
    
    Instructions:
    1. If "timings" are missing, infer a standard default like "11:00 AM - 11:00 PM".
    2. GENERATE a "description": Create a warm, inviting 1-sentence summary (e.g., "Experience authentic flavors at [Name], serving the best [Dishes] in [Location].").
    3. Do NOT extract specific menu items or dishes. The user will add them manually. Return an empty "products" array.
    `;
        } else {
            // Default Shop Prompt
            systemPrompt = `
    You are an AI assistant that extracts structured data for a RETAIL SHOP website from a voice transcript.
    Extract the following fields into a pure JSON object. Do not wrap in markdown code blocks.
    
    Required JSON Structure:
    {
      "name": "Shop Name (string)",
      "owner_name": "Owner Name (string)",
      "contact_number": "Contact Number (string)",
      "timing": "Opening/Closing Timing (string)",
      "established_year": "Year Established (string)",
      "location": "City/Location (string)",
      "state": "State (string)",
      "pincode": "Pincode (string)",
      "address": "Full Address (string)",
      "description": "A short, welcoming description (max 20 words) based on the shop details (string)",
      "products": []
    }
    
    Instructions:
    1. If "timings" are missing, infer a standard default like "9:00 AM - 9:00 PM".
    2. If "established_year" is missing, use the current year "2024".
    3. If "location" is missing but "address" is present, extract city from address.
    4. GENERATE a "description": Create a warm, professional 1-sentence summary (e.g., "Welcome to [Name], your go-to destination for [Products] in [Location].").
    5. Do NOT extract specific products or items. The user will add them manually. Return an empty "products" array.
    `;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Transcript: ${transcript}` }
            ],
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        console.log('OpenAI Response:', content);

        const extractedData = JSON.parse(content || '{}');

        return NextResponse.json({ transcript, data: extractedData });

    } catch (error: any) {
        console.error('Processing Error (Catch Block):', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
