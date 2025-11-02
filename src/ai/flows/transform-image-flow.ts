
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const transformImageSchema = z.object({
    image: z.string().describe("The image to transform as a data URI."),
    prompt: z.string().describe("The prompt to use for the transformation."),
});

export async function transformImage(
    image: string,
    prompt: string
): Promise<string> {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
            { media: { url: image } },
            { text: prompt },
        ],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }
    return media.url;
}
