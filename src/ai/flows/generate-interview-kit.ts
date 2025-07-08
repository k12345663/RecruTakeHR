
'use server';

/**
 * @fileOverview An interview kit generation AI agent.
 *
 * - generateInterviewKit - A function that handles the interview kit generation process.
 * - GenerateInterviewKitInput - The input type for the generateInterviewKit function.
 * - GenerateInterviewKitOutput - The return type for the generateInterviewKit function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { randomUUID } from 'crypto';


const GenerateInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description to generate an interview kit for.'),
  unstopProfileLink: z.string().describe("Primary Source - COMPULSORY, conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements."),
  candidateResumeDataUri: z.string().optional().describe("Primary Source - OPTIONAL, but CRUCIAL if provided. This is the full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. You MUST analyze it with extreme depth as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. The quality of your questions depends on this deep analysis."),
  candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
});

export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  id: z.string().optional().describe("A unique identifier. Do not generate this field; it will be added later."),
  question: z.string().describe("A crisp, direct, and deeply technical interview question."),
  modelAnswer: z.string().describe("A brief, pointwise answer. Use markdown for bullet points. Include formulas or code snippets where relevant. The entire answer should be a single string."),
});

const GenerateInterviewKitOutputSchema = z.object({
  questions: z.array(QuestionAnswerPairSchema)
    .describe('A list of 20-30 purely technical interview questions with brief, pointwise answers.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `
You are an expert technical recruiter with two decades of experience. Your mission is to generate a list of 20-30 interview questions that probe a candidate's real-world experience, problem-solving skills, and technical decision-making process. The questions must be based on the provided job description and candidate context.

**CRITICAL STYLE GUIDE: DO NOT ASK DEFINITIONAL QUESTIONS.**
Instead of "What is a REST API?", ask "Describe your process for designing a RESTful API endpoint. What conventions do you follow?".
Instead of "What is a Singleton pattern?", ask "Tell me about a time you used the Singleton pattern in a project. Why was it the right choice, and what were the potential downsides?".

Frame questions to start conversations. Use phrases like:
- "Walk me through..."
- "Tell me about a time..."
- "Describe your process for..."
- "How do you approach..."
- "What was your reasoning for..."

CONTEXT FOR ANALYSIS:
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this to tailor the questions to the candidate's specific experience.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

YOUR TASK:

1.  **Generate a Flat List of Questions**: Create a list of 20-30 open-ended, experience-based technical questions.
2.  **Ensure High Quality**: Questions must be tailored to the role's domain (e.g., Software Development, DevOps, Data Science, Finance, Sales), the specified seniority level, and the candidate's profile.
3.  **Provide Pointwise Answers**: For each question, provide a brief, pointwise \`modelAnswer\`. The answer should outline what a good response would cover.
    *   Use markdown for bullet points (e.g., using \`*\` or \`-\`).
    *   Include key concepts, examples, or steps a candidate should mention.
    *   The entire answer for a single question must be a single string.

The entire output MUST be a single JSON object with a "questions" key, which contains an array of question-answer objects as per the schema.
`,
});

const generateInterviewKitFlow = ai.defineFlow(
  {
    name: 'generateInterviewKitFlow',
    inputSchema: GenerateInterviewKitInputSchema,
    outputSchema: GenerateInterviewKitOutputSchema,
  },
  async input => {
    const {output} = await generateInterviewKitPrompt(input);
    if (!output || !output.questions) {
      throw new Error("AI failed to generate interview kit content.");
    }

    const validatedOutput: GenerateInterviewKitOutput = {
      questions: (output.questions || []).map(q => ({
        id: randomUUID(),
        question: q.question || "Missing question text",
        modelAnswer: q.modelAnswer || "Missing model answer.",
      })),
    };
    
    return validatedOutput;
  }
);
