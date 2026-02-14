import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `recording-${timestamp}.webm`;

        // Convert File to ArrayBuffer then to Buffer
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabaseServer.storage
            .from('voice-recordings')
            .upload(filename, buffer, {
                contentType: audioFile.type || 'audio/webm',
                upsert: false,
            });

        if (error) {
            console.error('Upload error:', error);
            return NextResponse.json(
                { error: 'Failed to upload audio: ' + error.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseServer.storage
            .from('voice-recordings')
            .getPublicUrl(data.path);

        return NextResponse.json({
            success: true,
            audioUrl: urlData.publicUrl,
            path: data.path,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
