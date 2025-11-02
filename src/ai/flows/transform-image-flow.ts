
'use server';
/**
 * @fileOverview An image transformation AI flow.
 *
 * - transformImage - A function that handles the image transformation process.
 * - TransformImageInput - The input type for the transformImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TransformImageInputSchema = z.object({
  image: z
    .string()
    .describe(
      "A photo of an image to transform, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The user-provided prompt to guide the transformation.'),
});

export type TransformImageInput = z.infer<typeof TransformImageInputSchema>;

export async function transformImage(input: TransformImageInput): Promise<string> {
  const result = await transformImageFlow(input);
  return result.media;
}

const transformImageFlow = ai.defineFlow(
  {
    name: 'transformImageFlow',
    inputSchema: TransformImageInputSchema,
    outputSchema: z.object({ media: z.string() }),
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        { media: { url: input.image } },
        { text: input.prompt },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image transformation failed to produce an image.');
    }
    
    return { media: media.url };
  }
);
