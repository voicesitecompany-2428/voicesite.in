import { z } from 'zod';

export const ProcessVoiceSchema = z.object({
    audio: z.any().refine((val) => val instanceof File || val instanceof Blob, {
        message: "Audio file is required and must be a valid File or Blob",
    }),
    type: z.enum(['Shop', 'Menu']).optional().default('Shop'),
});

export type ProcessVoiceInput = z.infer<typeof ProcessVoiceSchema>;
