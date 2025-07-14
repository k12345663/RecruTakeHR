
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
  question: z.string().describe("A crisp, direct, and deeply technical interview question. The question MUST NOT be open-ended, philosophical, or behavioral (e.g., AVOID 'How would you handle X?', 'Describe a time when...'). It must be a direct probe for factual, technical knowledge or a specific problem to solve."),
  modelAnswer: z.string().describe("A comprehensive, pointwise answer formatted using markdown bullet points. The number of points should be proportional to the question's complexity (e.g., 2-3 for simple definitions, 5-7 for complex topics). The entire answer MUST be a single string. For coding questions, provide the complete code snippet first using markdown fences, followed by a bulleted explanation. For other questions, use bullet points for concise explanations, including formulas where relevant."),
});

const GenerateInterviewKitOutputSchema = z.object({
  questions: z.array(QuestionAnswerPairSchema)
    .describe('A list of 30 purely technical interview questions with comprehensive, pointwise answers.'),
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
You are an expert technical interviewer and recruitment strategist. Your single mission is to generate a comprehensive list of 30 **purely technical, specific, and practical interview questions**.

**ABSOLUTE RULES FOR QUESTION GENERATION:**

1.  **JD IS KING**: You MUST generate questions that are laser-focused on the skills explicitly listed in the Job Description. If the JD emphasizes 'Excel', 'Financial Modeling', or 'Customer Relationship Management', then the vast majority of the 30 questions MUST be about those specific topics.
2.  **IGNORE IRRELEVANT SKILLS**: DO NOT generate questions about programming languages (like Python, Java) or other technical skills IF THEY ARE NOT MENTIONED IN THE JOB DESCRIPTION, even if they appear on the candidate's resume.
3.  **ONLY TECHNICAL QUESTIONS**: NO BEHAVIORAL OR OPEN-ENDED QUESTIONS. Questions MUST be direct, factual, and technical probes. **ABSOLUTELY AVOID** vague questions like "Describe your experience with X", "What are the responsibilities of...", "How would you handle Y?", "Why are X skills important?", or "Explain the importance of...".

CONTEXT FOR ANALYSIS:
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this for context, but only use it to tailor questions if the skills are relevant to the JD.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

YOUR TASK:

1.  **Identify Job Domain & Generate Aligned Questions**: First, analyze the Job Description to determine the core domain (e.g., Software Development, DevOps, Data Science, Finance, Sales, Customer Support). Then, create exactly 30 technical questions that are perfectly aligned with that domain.
    *   **For Software Roles (Software Development, Backend, Frontend, DevOps, SDET):** Questions must cover specific languages, frameworks, algorithms, data structures, and system design concepts mentioned in the JD. Include short, function-based coding questions.
    *   **For Sales Roles (SDR, Account Executive):** Questions must focus on sales methodologies, CRM tools (like Salesforce), lead qualification, and process-oriented tasks mentioned in the JD.
    *   **For Finance Roles (Financial Analyst, Investment Banker):** Questions must focus on financial modeling, valuation methods, and specific spreadsheet functions (like VLOOKUP, Pivot Tables in Excel) if required by the JD. Include questions that require formulas or calculations.
    *   **For Customer Support Roles:** Questions must be practical and scenario-based, focusing on troubleshooting processes, communication techniques, and proficiency with required tools (like Excel for reporting).

2.  **Ensure High Quality & Proper Sourcing**:
    *   The **Job Description is the primary source**. The majority of your questions (at least 25) must be derived from the technical skills and responsibilities mentioned in the JD.
    *   If a resume is provided, you may generate **a maximum of two (2) questions** that are directly tailored to the candidate's specific projects or experiences listed on the resume. **CRITICAL: Only do this if the skill is directly relevant to the Job Description's domain.**
    *   All questions must be tailored to the specified seniority level.

3.  **Provide Comprehensive, Pointwise Answers**:
    *   **Format**: Use markdown for bullet points ('*' or '-'). The number of points should be appropriate for the question's complexity. For coding questions, provide the full code snippet first (using markdown fences), then the explanation in bullets.
    *   **Content**: The answer must be direct and factual. It is critical that you include key concepts, definitions, **formulas (e.g., for finance or data science questions)**, or short code snippets where applicable.
    *   **Structure**: The entire answer must be a single string.
    *   **CRITICAL RULE FOR MODEL ANSWERS**: The 'modelAnswer' MUST be the **actual answer** to the question, written from the perspective of an expert candidate. **DO NOT** provide instructions or commentary for the interviewer (e.g., AVOID 'The candidate should explain...').

The entire output MUST be a single JSON object with a "questions" key, containing an array of 30 question-answer objects.
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
