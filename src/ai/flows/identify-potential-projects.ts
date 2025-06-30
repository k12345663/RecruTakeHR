'use server';

/**
 * @fileOverview A Genkit flow to identify and summarize potential project experiences for interview discussion.
 *
 * As a recruiter, I want the AI to identify and summarize potential project experiences
 * that can be discussed during an interview, so I can use those for real-world problems.
 *
 * @interface IdentifyPotentialProjectsInput - Defines the input schema for the flow.
 * @interface ProjectSummary - Defines the schema for summarizing a project experience.
 * @function identifyPotentialProjects - The main function to execute the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Input schema for the IdentifyPotentialProjects flow.
 */
const IdentifyPotentialProjectsInputSchema = z.object({
  jobDescription: z.string().describe('The job description for the role.'),
  candidateResume: z.string().describe('The candidate\'s resume text.'),
});

/**
 * Type definition for the input schema.
 */
export type IdentifyPotentialProjectsInput = z.infer<typeof IdentifyPotentialProjectsInputSchema>;

/**
 * Schema for summarizing a project experience.
 */
const ProjectSummarySchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  summary: z.string().describe('A brief summary of the project and its relevance to real-world problems.'),
  keySkills: z.string().describe('Relevant key skills used.'),
});

/**
 * Type definition for the project summary schema.
 */
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * Output schema for the IdentifyPotentialProjects flow.
 */
const IdentifyPotentialProjectsOutputSchema = z.array(ProjectSummarySchema).describe('A list of potential project experiences to discuss during an interview.');

/**
 * Type definition for the output schema.
 */
export type IdentifyPotentialProjectsOutput = z.infer<typeof IdentifyPotentialProjectsOutputSchema>;

/**
 * Main function to execute the IdentifyPotentialProjects flow.
 * @param input - The input containing the job description and candidate resume.
 * @returns A promise resolving to the list of potential project experiences.
 */
export async function identifyPotentialProjects(input: IdentifyPotentialProjectsInput): Promise<IdentifyPotentialProjectsOutput> {
  return identifyPotentialProjectsFlow(input);
}

const identifyPotentialProjectsPrompt = ai.definePrompt({
  name: 'identifyPotentialProjectsPrompt',
  input: {schema: IdentifyPotentialProjectsInputSchema},
  output: {schema: IdentifyPotentialProjectsOutputSchema},
  prompt: `You are an expert recruiter. Analyze the job description and candidate\'s resume to identify projects
that are relevant for discussion during an interview. Focus on extracting projects where the candidate gained
valuable experience and solved real-world problems.

Job Description: {{jobDescription}}
Candidate Resume: {{candidateResume}}

Identify and summarize these projects, highlighting their relevance to real-world applications and the skills
the candidate utilized.
`
});

const identifyPotentialProjectsFlow = ai.defineFlow(
  {
    name: 'identifyPotentialProjectsFlow',
    inputSchema: IdentifyPotentialProjectsInputSchema,
    outputSchema: IdentifyPotentialProjectsOutputSchema,
  },
  async input => {
    const {output} = await identifyPotentialProjectsPrompt(input);
    return output!;
  }
);
