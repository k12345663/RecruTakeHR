
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
  question: z.string().describe("A crisp, direct, and deeply technical interview question. The question MUST NOT be open-ended, philosophical, or behavioral (e.g., AVOID 'How would you handle X?', 'Describe a time when...'). It must be a direct probe for factual, technical knowledge or a specific problem to solve."),
  modelAnswer: z.string().describe("A comprehensive, multi-point answer. For each point, provide a title followed by a detailed explanation. Separate each point with a triple newline ('\\n\\n\\n'). The entire answer MUST be a single string. For coding questions, provide the complete code snippet first, followed by a multi-point explanation of the code's logic, structure, and efficiency."),
});

const GenerateInterviewKitOutputSchema = z.object({
  questions: z.array(QuestionAnswerPairSchema)
    .describe('A list of 30 purely technical interview questions with comprehensive, multi-point answers.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `
Generate a JSON object containing a comprehensive list of *30 purely technical, specific, and practical interview questions*, with corresponding gold-standard model answers. Follow these rules and structure:

# Rules for Question Generation

1. *Align Strictly with Job Description*: Formulate ONLY questions directly aligned with the listed skills and responsibilities from the provided Job Description ({{{jobDescription}}}). The focus must remain on the core technical competencies outlined in the JD.
2. *Exclude Irrelevant Skills*: Do NOT create questions about skills or technologies unrelated to the Job Description, even if they appear in the candidate’s resume or profile.
3. *No Behavioral Questions*: Avoid open-ended or opinion-based questions. Stick exclusively to technical, fact-based, and performance-driven prompts.
4. *Balance and Depth*:
   - Cover the full range of core technical skills mentioned in the JD.
   - Ensure a practical approach, including real-world applications, scenarios, and exercises where appropriate.
   - For coding-related roles, include short function-based coding prompts.
   - For finance or analytical roles, include problem-solving exercises and spreadsheet-oriented challenges.
   - For tool-based expertise (e.g., CRM systems), ensure the questions are specific to features, workflows, or use cases of the tool.

# Rules for Model Answers

1. *Structure*: Each model answer must follow this format:
   - Begin with the direct answer (e.g., code snippet, formula, method name, etc.)
   - Follow with multiple bullet points, formatted as:
     
     A title for the point.

     A detailed, self-explanatory explanation for that point.
     
     Separate each bullet point with triple newlines (\\n\\n\\n).
2. *Content*:
   - Provide detailed and accurate expert-level responses, including variations or nuances where appropriate.
   - For coding questions, include well-commented code along with detailed explanations.
   - For finance-related questions, include step-by-step calculations and conceptual clarifications.
   - For tool-focused questions, describe workflows and key feature applications.
3. *No Instructions*: Write the answers as if provided by an expert candidate. Avoid commentary or instructions for the interviewer.

# Task Steps

1. *Analyze the Job Description*: Isolate the core technical skills explicitly listed in {{{jobDescription}}}.
2. *Generate 30 Questions*:
   - Base the majority (at least 25) on skills from the Job Description.
   - Optionally include up to 2 questions tailored to the resume ({{candidateResumeFileName}}) if it directly aligns with JD requirements.
   - Ensure all questions are relevant and practical, avoiding theoretical or abstract phrasing.
3. *Provide Model Answers*: Each model answer must be a robust and detailed response to the corresponding question.

# Output Format

The final output must be a single JSON object with the following structure:
json
{
  "questions": [
    {
      "question": "[Insert a clearly defined technical question here, fully aligned with the JD.]",
      "modelAnswer": "[Insert a gold-standard model answer here, following the formatting rules specified.]"
    },
    ...
  ]
}


# Examples (For Clarity)

*If a JD emphasizes financial modeling and Excel:*
json
{
  "question": "How would you use VLOOKUP in Excel to match values from two data tables based on a shared key?",
  "modelAnswer": "BEGIN MODEL ANSWER\\n\\n\\nUsing VLOOKUP Syntax.\\n\\nThe standard syntax for VLOOKUP is '=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])'. The key elements are:\\n\\n- 'lookup_value': The value to be searched for.\\n- 'table_array': The range where the search will occur...\\n\\n\\nCorrect Formula.\\n\\nIf matching Employee IDs in Column A with Departments in Table B from Range B1:D50, the formula would be:\\n'=VLOOKUP(A2, $B$1:$D$50, 3, FALSE)'...\\n\\n..."
}


*If a JD emphasizes coding skills (e.g., Python for a backend role):*
json
{
  "question": "Write a Python function to reverse a linked list and explain its time complexity.",
  "modelAnswer": "BEGIN MODEL ANSWER\\n\\n\\nPython Function.\\n\\nHere is a Python implementation for reversing a linked list:\\npython\\ndef reverse_linked_list(head):\\n    prev = None\\n    current = head\\n    while current:\\n        next_temp = current.next\\n        current.next = prev\\n        prev = current\\n        current = next_temp\\n    return prev\\n\\n\\n\\nExplanation of Logic.\\n\\nThe function leverages a 'while' loop to traverse...\\n\\n\\nTime Complexity Analysis.\\n\\nThe function's time complexity is...\\n\\n..."
}


# Notes
- You MUST provide exactly 30 high-quality technical questions.
- Maintain the JSON structure strictly for ease of integration.
- Use the context ({{{jobDescription}}}, {{{candidateResumeFileName}}}, etc.) correctly without deviating from outlined guidelines.

# Context for Analysis
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (Analyze this for context, but only use it to tailor questions if the skills are relevant to the JD.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}


Remember, the entire output MUST be a single JSON object with a "questions" key, containing an array of 30 question-answer objects.
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
