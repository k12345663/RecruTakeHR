
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

**ABSOLUTE RULE: ONLY TECHNICAL QUESTIONS. NO BEHAVIORAL OR OPEN-ENDED QUESTIONS.**

**First, you MUST determine the role's domain from the Job Description (e.g., Software Development, DevOps, Data Science, Finance, Sales, Customer Support). The type and nature of questions you generate MUST align with this domain.** For example, do not ask a Sales candidate about Python algorithms, even if Python is on their resume. The questions must be relevant to the core functions of the job.

CONTEXT FOR ANALYSIS:
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this to tailor questions to the candidate's specific experience.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

YOUR TASK:

1.  **Generate a Diverse and Deeply Technical Question Set**: Based on the identified domain, create a list of exactly 30 purely technical questions.
    *   **CRITICAL RULE FOR ALL QUESTIONS**: Questions MUST be direct, factual, and technical probes. **ABSOLUTELY AVOID open-ended, behavioral, or vague questions** like "Describe your experience with X", "What are the responsibilities of...", "How would you handle Y?", "Why are X skills important?", or "Explain the importance of...". Instead, ask for specific definitions, explanations, code, calculations, or process walkthroughs. Every question must be designed to test a concrete skill or knowledge area.
    *   **For Software-Related Roles (Software Development, Backend, Frontend, Full-Stack, SDET):** The question set MUST include a mix of the following types:
        *   **Language Specificity**: All coding questions MUST be tailored to the primary programming language(s) mentioned in the Job Description and Candidate Resume. Do not ask the same conceptual question in multiple languages.
        *   **Short, function-based questions (2-3 questions)**: E.g., "Write a Python function that takes a list of strings and returns a new list with the strings sorted by length."
        *   **Algorithmic / DSA Questions (1-2 questions)**: E.g., "Given a sorted array of integers, write a function that finds the starting and ending position of a given target value."
        *   **System Design Questions (1-2 questions)**: E.g., "Design a basic URL shortening service like bit.ly." or "Outline the architecture for a simple photo-sharing service."
    *   **For Sales-Related Roles (SDR, Account Executive):** Focus on tools, processes, and methodologies. E.g., "You've been given a list of 100 cold leads. Describe the sequence of steps you would take in Salesforce to track your outreach." or "What are the key differences between a 'Lead', an 'Account', and an 'Opportunity' object in a standard CRM?"
    *   **For Finance-Related Roles (Financial Analyst, Investment Banker):** Focus on financial modeling, valuation, and tool proficiency. E.g., "Given Revenue, COGS, and Operating Expenses, what is the formula to calculate EBITDA?" or "In Excel, you have a column of stock prices. Which function would you use to calculate the 30-day moving average?"
    *   **For Customer Support Roles:** Focus on scenario-based problem solving and tool usage. E.g., "A customer reports that they have not received their order. What are the first three pieces of information you would need to collect from them to investigate the issue?" or "You receive an email from an angry customer. Draft a professional, empathetic, and concise initial response." or "In Excel, what is the function to count the number of cells within a range that meet a given criteria?"
    *   **Adapt for other roles accordingly.** The key is that the *technical* aspect of the questions must match the *technical* aspect of the job.

2.  **Ensure High Quality & Proper Sourcing**:
    *   The **Job Description is the primary source**. The majority of your questions (at least 25) must be derived from the technical skills and responsibilities mentioned in the JD.
    *   If a resume is provided, you may generate **a maximum of two (2) questions** that are directly tailored to the candidate's specific projects or experiences listed on the resume. These questions should be used to probe their hands-on experience, not ask for a summary. **CRITICAL: If a skill on the resume is NOT relevant to the Job Description's domain, you MUST ignore it.**
    *   All questions must be tailored to the role's domain and the specified seniority level.

3.  **Provide Comprehensive, Pointwise Answers**:
    *   **Format**: Use markdown for bullet points ('*' or '-'). The number of points should be appropriate for the question's complexity—a simple definition might only need 2-3 points, while a system design question could require 5-7 points to be thorough. Each bullet point should deliver a single, concise point. For coding questions, provide the full code snippet first (using markdown fences), then the explanation in bullets.
    *   **Content**: The answer must be direct and factual. It is critical that you include key concepts, definitions, **formulas (e.g., for finance or data science questions)**, or short code snippets where applicable. Do not just describe theory; provide the actual formula or calculation if the question implies it.
    *   **Structure**: The entire answer must be a single string. Do not use paragraphs; use bullet points exclusively for the answer structure.
    *   **CRITICAL RULE FOR MODEL ANSWERS**: The 'modelAnswer' MUST be the **actual answer** to the question, written from the perspective of an expert candidate providing a model response. **DO NOT** under any circumstances provide instructions, commentary, or a script for the interviewer. For example, you must **AVOID** phrases like 'This question aims to...', 'The interviewer should look for...', 'I would ask...', or 'The candidate should explain...'. Your purpose is to provide the ideal answer, not to guide the interviewer on how to conduct the interview.

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
