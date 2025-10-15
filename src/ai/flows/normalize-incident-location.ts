'use server';

/**
 * @fileOverview Normalizes incident locations using Genkit and the Google Maps API.
 *
 * - normalizeIncidentLocation - A function that normalizes an incident location.
 * - NormalizeIncidentLocationInput - The input type for the normalizeIncidentLocation function.
 * - NormalizeIncidentLocationOutput - The return type for the normalizeIncidentLocation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NormalizeIncidentLocationInputSchema = z.object({
  location: z
    .string()
    .describe('The location of the incident, as free-form text.'),
});
export type NormalizeIncidentLocationInput = z.infer<
  typeof NormalizeIncidentLocationInputSchema
>;

const NormalizeIncidentLocationOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggested normalized locations.'),
});
export type NormalizeIncidentLocationOutput = z.infer<
  typeof NormalizeIncidentLocationOutputSchema
>;

export async function normalizeIncidentLocation(
  input: NormalizeIncidentLocationInput
): Promise<NormalizeIncidentLocationOutput> {
  return normalizeIncidentLocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'normalizeIncidentLocationPrompt',
  input: {schema: NormalizeIncidentLocationInputSchema},
  output: {schema: NormalizeIncidentLocationOutputSchema},
  prompt: `You are a location normalization expert. Given a raw location string, you will suggest normalized versions of the location.

  Location: {{{location}}}

  Respond with a JSON array of strings.  Each string should be a possible normalized version of the location.
  For example:
  ["1600 Amphitheatre Parkway, Mountain View, CA 94043, USA", "Amphitheatre Parkway, Mountain View, CA, USA"]
  `,
});

const normalizeIncidentLocationFlow = ai.defineFlow(
  {
    name: 'normalizeIncidentLocationFlow',
    inputSchema: NormalizeIncidentLocationInputSchema,
    outputSchema: NormalizeIncidentLocationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
