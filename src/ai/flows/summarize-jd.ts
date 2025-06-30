'use server';

/**
 * @fileOverview A job description summarization AI agent.
 *
 * - summarizeJD - A function that handles the job description summarization process.
 * - SummarizeJDInput - The input type for the summarizeJD function.
 * - SummarizeJDOutput - The return type for the summarizeJD function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeJDInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to generate a summary for.'),
});
export type SummarizeJDInput = z.infer<typeof SummarizeJDInputSchema>;

const SummarizeJDOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the job description.'),
});
export type SummarizeJDOutput = z.infer<typeof SummarizeJDOutputSchema>;

export async function summarizeJD(input: SummarizeJDInput): Promise<SummarizeJDOutput> {
  return summarizeJDFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeJDPrompt',
  input: {schema: SummarizeJDInputSchema},
  output: {schema: SummarizeJDOutputSchema},
  prompt: `You are a senior recruiter. Given a job description, summarize the key requirements and responsibilities of the job description in a concise manner.

Job Description:
{{jobDescription}}`,
});

const summarizeJDFlow = ai.defineFlow(
  {
    name: 'summarizeJDFlow',
    inputSchema: SummarizeJDInputSchema,
    outputSchema: SummarizeJDOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
