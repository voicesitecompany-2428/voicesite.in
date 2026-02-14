import { NextRequest, NextResponse } from 'next/server';
import { extractShopData, extractByContext } from '@/lib/openai';
import { transcribeWithSarvam } from '@/lib/sarvam';

export async function POST(request: NextRequest) {
    try {
        const { audioUrl, context } = await request.json();

        if (!audioUrl) {
            return NextResponse.json(
                { error: 'No audio URL provided' },
                { status: 400 }
            );
        }

        // Step 1: Download audio from Supabase Storage
        console.log('Fetching audio from:', audioUrl);
        const audioResponse = await fetch(audioUrl);

        if (!audioResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch audio file' },
                { status: 500 }
            );
        }

        const audioArrayBuffer = await audioResponse.arrayBuffer();
        const audioBuffer = Buffer.from(audioArrayBuffer);

        // Extract filename from URL
        const urlParts = audioUrl.split('/');
        const filename = urlParts[urlParts.length - 1] || 'recording.webm';

        // Step 2: Transcribe with Sarvam AI (supports Indian languages)
        console.log('Transcribing audio with Sarvam AI...');
        const transcription = await transcribeWithSarvam(audioBuffer, filename);
        console.log('Transcription:', transcription);

        // Step 3: Extract structured data with GPT-4o based on context
        console.log('Extracting data with context:', context || 'default');
        let extractedData;

        if (context && ['name', 'details', 'product'].includes(context)) {
            extractedData = await extractByContext(transcription, context);
        } else {
            extractedData = await extractShopData(transcription);
        }
        console.log('Extracted data:', extractedData);

        return NextResponse.json({
            success: true,
            transcription,
            extractedData,
        });
    } catch (error) {
        console.error('Process error:', error);
        return NextResponse.json(
            { error: 'Failed to process audio: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        );
    }
}
