// review-resume-skills.ts
'use server';

/**
 * @fileOverview This flow extracts technical skills from a resume.
 *
 * It takes a resume file (as a data URI) as input and returns a list of technical skills.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReviewResumeSkillsInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The candidate's resume file as a data URI (PDF/DOCX), must include MIME type and Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});

export type ReviewResumeSkillsInput = z.infer<typeof ReviewResumeSkillsInputSchema>;

const ReviewResumeSkillsOutputSchema = z.object({
  technicalSkills: z.array(z.string()).describe("A list of the candidate's technical skills extracted from the resume."),
});

export type ReviewResumeSkillsOutput = z.infer<typeof ReviewResumeSkillsOutputSchema>;

export async function reviewResumeSkills(input: ReviewResumeSkillsInput): Promise<ReviewResumeSkillsOutput> {
  return reviewResumeSkillsFlow(input);
}

const reviewResumeSkillsPrompt = ai.definePrompt({
  name: 'reviewResumeSkillsPrompt',
  input: {schema: ReviewResumeSkillsInputSchema},
  output: {schema: ReviewResumeSkillsOutputSchema},
  prompt: `You are a helpful AI assistant that extracts technical skills from a resume. Given the following resume, please identify and list the technical skills mentioned. 

Resume: {{media url=resumeDataUri}}`,
});

const reviewResumeSkillsFlow = ai.defineFlow(
  {
    name: 'reviewResumeSkillsFlow',
    inputSchema: ReviewResumeSkillsInputSchema,
    outputSchema: ReviewResumeSkillsOutputSchema,
  },
  async input => {
    const {output} = await reviewResumeSkillsPrompt(input);
    return output!;
  }
);
