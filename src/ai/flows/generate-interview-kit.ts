
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
  modelAnswer: z.string().describe("A comprehensive, pointwise answer formatted using markdown bullet points. The number of points should be proportional to the question's complexity (e.g., 2-3 for simple definitions, 5-7 for complex topics). The entire answer MUST be a single string. For coding questions, provide the complete code snippet using markdown fences, followed by a bulleted explanation. For other questions, use bullet points for concise explanations, including formulas where relevant."),
});

const GenerateInterviewKitOutputSchema = z.object({
  questions: z.array(QuestionAnswerPairSchema)
    .describe('A list of 20-30 purely technical interview questions with comprehensive, pointwise answers.'),
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

The questions should be tailored to the role's specific domain (e.g., Software Development, DevOps, Data Science, Finance, Sales) and calibrated to the seniority level required.

CONTEXT FOR ANALYSIS:
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this to tailor questions to the candidate's specific experience.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

YOUR TASK:

1.  **Generate a Diverse and Deeply Technical Question Set**: Create a list of 20-30 purely technical questions. For software-related roles, the set MUST include a mix of the following types, progressing from fundamental knowledge to complex application:
    *   **Conceptual Questions**: Test foundational knowledge (e.g., "What is the difference between X and Y?").
    *   **Practical Coding Questions (3-5 questions total)**: Include a mix of practical coding challenges.
        *   **Short, function-based questions (2-3 questions)**: These should be small, self-contained problems, like "write a function to reverse a string."
        *   **Algorithmic / DSA Questions (1-2 questions)**: These should be more complex, LeetCode-style problems that test knowledge of data structures and algorithms.
        *   For all coding questions, the model answer MUST include the complete code with markdown fences, followed by a bulleted explanation of the logic and time/space complexity.
    *   **System Design Questions (1-2 questions)**: For relevant roles (Backend, Full-stack, SRE, etc.), include high-level system design questions (e.g., "Design a system for a photo-sharing service like Instagram" or "Design a URL shortener"). The model answer should outline the architecture, components, database choices, and scaling strategies in bullet points.

2.  **Ensure High Quality & Proper Sourcing**:
    *   The **Job Description is the primary source** for questions. The majority of your questions (at least 25) must be derived from the technical skills and responsibilities mentioned in the JD.
    *   If a resume is provided, you may generate **a maximum of two (2) questions** that are directly tailored to the candidate's specific projects or experiences listed on the resume. These questions should be used to probe their hands-on experience.
    *   All questions must be tailored to the role's domain and the specified seniority level.

3.  **Provide Comprehensive, Pointwise Answers**:
    *   **Format**: Use markdown for bullet points (\`*\` or \`-\`). The number of points should be appropriate for the question's complexity—a simple definition might only need 2-3 points, while a system design question could require 5-7 points to be thorough. Each bullet point should deliver a single, concise point. For coding questions, provide the full code snippet first (using markdown fences), then the explanation in bullets.
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
