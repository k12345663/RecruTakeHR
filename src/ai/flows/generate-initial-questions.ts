'use server';

/**
 * @fileOverview Generates initial interview questions based on the job description.
 *
 * - generateInitialQuestions - A function that generates initial interview questions.
 * - GenerateInitialQuestionsInput - The input type for the generateInitialQuestions function.
 * - GenerateInitialQuestionsOutput - The return type for the generateInitialQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialQuestionsInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to generate interview questions for.'),
});

export type GenerateInitialQuestionsInput =
  z.infer<typeof GenerateInitialQuestionsInputSchema>;

const GenerateInitialQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The interview question.'),
      modelAnswer: z.string().describe('A model answer for the question.'),
    })
  ).describe('A list of interview questions and model answers.'),
});

export type GenerateInitialQuestionsOutput =
  z.infer<typeof GenerateInitialQuestionsOutputSchema>;

export async function generateInitialQuestions(
  input: GenerateInitialQuestionsInput
): Promise<GenerateInitialQuestionsOutput> {
  return generateInitialQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInitialQuestionsPrompt',
  input: {schema: GenerateInitialQuestionsInputSchema},
  output: {schema: GenerateInitialQuestionsOutputSchema},
  prompt: `You are a helpful AI assistant that generates interview questions based on the provided job description. Please create 5-7 questions.
\nJob Description: {{{jobDescription}}} `,
});

const generateInitialQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInitialQuestionsFlow',
    inputSchema: GenerateInitialQuestionsInputSchema,
    outputSchema: GenerateInitialQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
