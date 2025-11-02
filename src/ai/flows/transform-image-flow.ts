'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TransformImageInputSchema = z.object({
  image: z
    .string()
    .describe(
      "A photo of a room, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The style to furnish the room in.'),
});

const TransformImageOutputSchema = z.object({
  imageUrl: z
    .string()
    .describe(
      'The transformed image as a data URI.'
    ),
});

export type TransformImageInput = z.infer<typeof TransformImageInputSchema>;
export type TransformImageOutput = z.infer<typeof TransformImageOutputSchema>;

async function transformImage(input: TransformImageInput): Promise<TransformImageOutput> {
    return transformImageFlow(input);
}
export { transformImage };


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
              { media: { url: input.image } },
              { text: `Assume image is of a room in a domestic house. Decorate & Furnish this room in a style specified by the prompt form field value: ${input.prompt}` },
            ],
            config: {
              responseModalities: ['IMAGE'],
            },
        });

        if (!media?.url) {
            throw new Error('Image generation failed.');
        }

        return { imageUrl: media.url };
    }
  );
