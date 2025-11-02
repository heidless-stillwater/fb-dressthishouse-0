'use server';
/**
 * @fileOverview An image transformation AI agent.
 *
 * - transformImage - A function that handles the image transformation process.
 * - TransformImageInput - The input type for the transformImage function.
 * - TransformImageOutput - The return type for the transformImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MediaPart } from 'genkit/media';

const TransformImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a room, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The transformation instructions for the image.'),
});
export type TransformImageInput = z.infer<typeof TransformImageInputSchema>;

const TransformImageOutputSchema = z.object({
  transformedImageUrl: z.string().describe('The data URI of the transformed image.'),
});
export type TransformImageOutput = z.infer<typeof TransformImageOutputSchema>;

export async function transformImage(input: TransformImageInput): Promise<TransformImageOutput> {
  return transformImageFlow(input);
}

const transformImageFlow = ai.defineFlow(
  {
    name: 'transformImageFlow',
    inputSchema: TransformImageInputSchema,
    outputSchema: TransformImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
            { media: { url: input.imageDataUri } },
            { text: input.prompt },
        ],
        config: {
            responseModalities: ['IMAGE'],
        },
    });

    if (!media.url) {
        throw new Error('Image transformation failed to produce a result.');
    }

    return {
        transformedImageUrl: media.url,
    };
  }
);
