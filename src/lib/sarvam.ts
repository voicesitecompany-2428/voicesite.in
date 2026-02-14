/**
 * Sarvam AI Speech-to-Text Integration
 * Uses Saarika model for Indian language transcription
 * Docs: https://docs.sarvam.ai/api-reference-docs/endpoints/speech-to-text
 */

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_STT_ENDPOINT = 'https://api.sarvam.ai/speech-to-text';

if (!SARVAM_API_KEY) {
    console.warn('Warning: SARVAM_API_KEY is not set. Sarvam AI features will not work.');
}

export interface SarvamTranscriptionResponse {
    request_id: string;
    transcript: string;
    language_code: string | null;
}

/**
 * Transcribe audio using Sarvam AI's Saarika model
 * Supports 10+ Indian languages + English with automatic language detection
 * 
 * @param audioBuffer - The audio file buffer
 * @param filename - Original filename (used to determine MIME type)
 * @returns Transcribed text
 */
export async function transcribeWithSarvam(
    audioBuffer: Buffer,
    filename: string
): Promise<string> {
    if (!SARVAM_API_KEY) {
        throw new Error('SARVAM_API_KEY is not configured');
    }

    // Determine MIME type from filename
    const extension = filename.split('.').pop()?.toLowerCase() || 'webm';
    const mimeTypes: Record<string, string> = {
        'webm': 'audio/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'mp4': 'audio/mp4',
        'm4a': 'audio/x-m4a',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
    };
    const mimeType = mimeTypes[extension] || 'audio/webm';

    // Create FormData with audio file
    const formData = new FormData();
    // Convert Buffer to ArrayBuffer for Blob compatibility
    const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', 'saarika:v2.5');
    // Use "unknown" for automatic language detection
    formData.append('language_code', 'unknown');

    const response = await fetch(SARVAM_STT_ENDPOINT, {
        method: 'POST',
        headers: {
            'api-subscription-key': SARVAM_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Sarvam API error:', response.status, errorText);
        throw new Error(`Sarvam API failed: ${response.status} - ${errorText}`);
    }

    const data: SarvamTranscriptionResponse = await response.json();
    console.log('Sarvam transcription result:', {
        request_id: data.request_id,
        language_code: data.language_code,
        transcript_length: data.transcript?.length,
    });

    return data.transcript;
}

/**
 * Transcribe and translate audio to English using Sarvam AI's Saaras model
 * Auto-detects input language and outputs English translation
 * 
 * @param audioBuffer - The audio file buffer
 * @param filename - Original filename
 * @returns English translated transcript
 */
export async function transcribeAndTranslateWithSarvam(
    audioBuffer: Buffer,
    filename: string
): Promise<string> {
    if (!SARVAM_API_KEY) {
        throw new Error('SARVAM_API_KEY is not configured');
    }

    const extension = filename.split('.').pop()?.toLowerCase() || 'webm';
    const mimeTypes: Record<string, string> = {
        'webm': 'audio/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'mp4': 'audio/mp4',
        'm4a': 'audio/x-m4a',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
    };
    const mimeType = mimeTypes[extension] || 'audio/webm';

    const formData = new FormData();
    // Convert Buffer to ArrayBuffer for Blob compatibility
    const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', 'saaras:v2.5');

    const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
        method: 'POST',
        headers: {
            'api-subscription-key': SARVAM_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Sarvam Translate API error:', response.status, errorText);
        throw new Error(`Sarvam Translate API failed: ${response.status} - ${errorText}`);
    }

    const data: SarvamTranscriptionResponse = await response.json();
    return data.transcript;
}
