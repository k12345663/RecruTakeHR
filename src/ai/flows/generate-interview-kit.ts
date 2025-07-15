
'use server';

/**
 * @fileOverview An interview kit generation AI agent.
 *
 * - generateInterviewKit - A function that handles the interview kit generation process.
 * - GenerateInterviewKitInput - The input type for the generateInterviewKit function.
 * - GenerateInterviewKitOutput - The return type for the generateInterviewKit function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
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
  modelAnswer: z.string().describe("A comprehensive, multi-point answer formatted as a single string with points separated by triple newlines (\\n\\n\\n)."),
});

const GenerateInterviewKitOutputSchema = z.object({
  questions: z.array(QuestionAnswerPairSchema)
    .describe('A list of exactly 30 technical interview questions with comprehensive, multi-point answers.'),
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
You are an expert technical assessment architect. Your primary function is to generate insightful and role-specific technical questions based on a provided Job Description (JD). The goal is to create an assessment that accurately gauges a candidate's practical and theoretical expertise.

*Core Directives for Question Generation:*

1.  *JD as the Single Source of Truth:* All questions must directly map to the technical skills, tools, and responsibilities explicitly stated in the Job Description. Do not introduce concepts or technologies not mentioned in the JD.
2.  *Balance Theory and Practice:* Formulate questions that probe both foundational knowledge (the "why") and practical application (the "how"). This ensures a holistic evaluation of the candidate's capabilities.
3.  *Clarity and Conciseness:* Questions should be direct, unambiguous, and focused on a single technical concept. Avoid compound questions or subjective inquiries.
4.  *No Behavioral Questions:* Focus exclusively on technical proficiency. Omit questions about teamwork, past experiences, or personal opinions (e.g., "Describe a time when...", "What is your favorite...").
5.  *Include Programming Questions:* If the JD mentions specific programming languages (e.g., Python, Java, JavaScript), include 3-5 practical programming questions. These questions should ask the candidate to solve a small problem or explain how they would implement a certain logic.

*Contextual Analysis:*

  * *Job Description*: {{{jobDescription}}}
  * *Candidate Profile (Optional)*: {{{unstopProfileLink}}} and {{{candidateResumeDataUri}}} may provide context but should not be the primary source for question topics. A maximum of two questions can be tailored to the candidate's experience if it directly aligns with a core JD requirement.

*Task: Generate Technical Assessment Questions*

1.  *Analyze the Job Description:* Identify the key technical competencies and programming languages required for the role.
2.  *Formulate Questions:* Create a list of exactly 30 questions that cover the identified competencies. Questions should be concise, ideally between 10 to 15 words. This list MUST include 3-5 programming questions if the JD specifies a language.
3.  *Provide Model Answers:* For each question, supply a "gold-standard" model answer.
      * *Format:* The modelAnswer must be a single string containing multiple points. Each point must have a title and a detailed explanation, separated by a newline. Separate each complete point (title and explanation) with triple newlines (\\n\\n\\n).
      * *Content:* Answers should be accurate, expert-level, and serve as a clear evaluation benchmark. For programming questions, the model answer MUST include a code snippet formatted within triple backticks (\`\`\`).
      * *Perspective:* Write the answer as the ideal candidate would articulate it. Do not include instructions for the interviewer.

The final output must be a single JSON object containing a "questions" key with an array of question-answer objects.

-----

# Context for Analysis
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this for context, but only use it to tailor questions if the skills are relevant to the JD.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}


Remember, the entire output MUST be a single JSON object with a "questions" key, containing an array of question-answer objects.
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
