
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
  modelAnswer: z.string().describe("A brief, pointwise answer formatted using markdown bullet points. The entire answer MUST be a single string. For coding questions, provide the complete code snippet using markdown fences, followed by a bulleted explanation. For other questions, use bullet points for concise explanations, including formulas where relevant."),
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
You are an expert technical interviewer. Your mission is to generate a comprehensive list of 20-30 purely technical interview questions based on the provided job description and candidate context.

The questions should be tailored to the role's specific domain (e.g., Software Development, DevOps, Data Science, Finance, Sales) and calibrated to the seniority level required. The question set should cover a range of difficulty, from foundational concepts to advanced, practical problem-solving.

CONTEXT FOR ANALYSIS:
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this to tailor questions to the candidate's specific experience.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

YOUR TASK:

1.  **Generate a Flat List of Questions**: Create a list of 20-30 purely technical questions. The questions should progress from fundamental knowledge to more complex, application-based scenarios.
2.  **Include Coding Questions**: For software-related roles, ensure that **2-3 questions** are practical coding challenges. These could involve:
    *   Asking the candidate to write a function to solve a specific problem.
    *   Providing a code snippet and asking the candidate to identify bugs, explain its functionality, or refactor it for performance.
    *   The \`modelAnswer\` for these questions MUST include the complete, correct code snippet formatted with markdown code fences, followed by a bulleted explanation of the logic.
3.  **Ensure High Quality & Proper Sourcing**:
    *   The **Job Description is the primary source** for questions. The majority of your questions (at least 25) must be derived from the technical skills and responsibilities mentioned in the JD.
    *   If a resume is provided, you may generate **a maximum of two (2) questions** that are directly tailored to the candidate's specific projects or experiences listed on the resume. These questions should be used to probe their hands-on experience.
    *   All questions must be tailored to the role's domain and the specified seniority level.
4.  **Provide Brief, Pointwise Answers**: For each question, provide a \`modelAnswer\` that is structured as a series of bullet points.
    *   **Format**: Use markdown for bullet points (\`*\` or \`-\`). Each bullet point should deliver a single, concise point. For coding questions, provide the full code snippet first (using markdown fences), then the explanation in bullets.
    *   **Content**: The answer must be direct and factual. It is critical that you include key concepts, definitions, **formulas (e.g., for finance or data science questions)**, or short code snippets where applicable. Do not just describe theory; provide the actual formula or calculation if the question implies it.
    *   **Structure**: The entire answer must be a single string. Do not use paragraphs; use bullet points exclusively for the answer structure.

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
