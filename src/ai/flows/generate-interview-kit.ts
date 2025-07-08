
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
import type { QuestionDifficulty } from '@/types/interview-kit'; // For difficultyTimeMap
import { randomUUID } from 'crypto';

// This map is used in post-processing if AI doesn't provide estimatedTimeMinutes
const difficultyTimeMap: Record<QuestionDifficulty, number> = {
  Naive: 2,
  Beginner: 4,
  Intermediate: 6,
  Expert: 8,
  Master: 10,
};

const GenerateInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description to generate an interview kit for.'),
  unstopProfileLink: z.string().describe("Primary Source - COMPULSORY, conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements."),
  candidateResumeDataUri: z.string().optional().describe("Primary Source - OPTIONAL, but CRUCIAL if provided. This is the full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. You MUST analyze it with extreme depth as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. The quality of your questions depends on this deep analysis."),
  candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
});

export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  id: z.string().optional().describe("A unique identifier for the question. This is for internal use and will be added automatically. Do not generate this field."),
  question: z.string().describe("A crisp, direct, and deeply technical interview question, ONE or TWO lines at most. The question MUST AVOID being generic or philosophical (e.g., avoid \"What's the difference between X and Y?\"). Instead, it should be a practical probe designed to test hands-on expertise in one of the core technical areas: Conceptual Understanding, Practical Application, Problem Solving, Optimization, Best Practices, Debugging, or Scalability/Security. The question must be insightful and highly specific, directly derived from projects, skills, or achievements mentioned in the Candidate's Unstop Profile and Resume. Do NOT include the candidate's name in the question itself."),
  interviewerNote: z.string().describe("A brief, one-sentence note FOR THE INTERVIEWER. This note MUST explain the strategic purpose of the question, guiding the interviewer on what to look for. For example, 'This tests the candidate's ability to articulate the business impact of their technical work' or 'This probes the depth of their hands-on experience with [Technology from Resume]'. This note should NOT be visible to the candidate. Each note MUST conclude with the exact sentence: \"If the candidate provides relevant, practical answers, mark them accordingly. If the answer is partially correct, partial marks should be allocated.\""),
  modelAnswer: z.string().describe("A \"Model Answer Guide\" for the interviewer, composed of MULTIPLE points (at least 3-4) to form a comprehensive checklist. Format this as a single string where each checklist point is separated by a triple newline ('\\n\\n\\n'). Each point MUST follow this format EXACTLY: `A title for the evaluation point.\\n\\nA detailed, multi-paragraph explanation written as an expert would deliver it, referencing real tools, workflows, and best practices with deep technical reasoning. It must be a human, real-world style answer, not generic or superficial.` CRITICAL: DO NOT use phrases that describe what the candidate should do (e.g., AVOID 'The candidate explains...', 'Describes how they...'). Similarly, AVOID first-person narrative (e.g., AVOID 'I did this...'). Instead, write the actual, detailed answer itself as a generalized, expert-level explanation."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills. Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale. This MUST be calibrated based on the candidate's experience level and the role's seniority. Junior roles should have more Beginner/Intermediate questions, while senior roles should focus on Expert/Master. Assign based on JD requirements and candidate's apparent skill level."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  id: z.string().optional().describe("A unique identifier for the competency. This is for internal use and will be added automatically. Do not generate this field."),
  name: z.string().describe('The name of the competency, derived from the job description.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe("A rich set of questions for this competency. These must be a mix of Technical, Scenario, and Behavioral questions that are deeply tailored to BOTH the job description and the candidate's resume. Questions should actively probe claims and details found in the candidate's resume, including specific projects (their tech stack, goals, accomplishments, challenges) and connect them to the role's requirements."),
});

const ScoringCriterionSchema = z.object({
  id: z.string().optional().describe("A unique identifier for the criterion. This is for internal use and will be added automatically. Do not generate this field."),
  name: z.string().optional().describe("A well-defined, distinct, and high-quality scoring criterion. It must be actionable, measurable, and directly relevant to the role, explicitly mentioning key technologies or skills from the Job Description and Resume."),
  weight: z.number().optional().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .optional()
    .describe("The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be deeply technical and contextually derived, explicitly referencing key phrases, technologies, and skills from the Job Description AND the Candidate's Resume to provide a robust framework for comprehensive evaluation."),
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
You are a world-class AI-powered recruitment strategist. Your mission is to create a deeply technical and practical interview kit to evaluate candidates for a wide range of roles, including **Software Development, DevOps, Data Science, Finance, and Sales**. You must act as an expert technical interviewer for the specific domain requested.

**CONTEXT FOR ANALYSIS (YOU MUST SYNTHESIZE ALL OF THE FOLLOWING SOURCES):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your primary goal is to assess the candidate's fitness for the role described in the Job Description, using the specific details from the resume to **tailor and personalize** the JD-centric questions. If, and only if, you identify a notable career gap, technology stack shift, or full career shift from the resume, you must generate one (and only one) respectful, non-judgmental behavioral or scenario-based question to understand the candidate's journey and motivations. Place this question within the most relevant competency (e.g., 'Communication & Collaboration' or a new, suitable non-technical competency). This is the ONLY way you should address such observations.)
{{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**YOUR TASK: GENERATE THE INTERVIEW KIT**

Based on your deep analysis of the Job Description, the candidate's Resume, and the provided **candidateExperienceContext**, generate a comprehensive set of **at least 25 highly technical, realistic interview questions**. You MUST calibrate the difficulty and scope of your questions to align with BOTH the role's requirements and the candidate's stated experience level, adhering to current industry standards. For junior roles, this includes foundational questions (e.g., "What is...?"). For senior roles, focus on architectural, strategic, and leadership challenges.

**QUESTION GENERATION PRINCIPLES:**

1.  **Calibrate to Experience Level**: Your first priority is to ensure the difficulty and nature of the questions are appropriate for the candidate's experience level as described in the context. If a user's edit makes a question too simple for a senior candidate (e.g., "What is Python?"), you MUST refine it to be more advanced (e.g., "Describe how Python's GIL affects concurrent programming and what strategies you'd use to mitigate it in a high-throughput data pipeline."). Conversely, if a question is too complex for a junior role, simplify it to test foundational knowledge.

2.  **Maintain Role Focus**: Your primary goal is to ensure the question kit evaluates fitness for the role defined in the **Job Description**. When refining, the resume should be used for context and for tailoring a small number of questions (2-3 at most) to probe specific experiences. Avoid letting the kit become a simple review of the resume; it must remain a rigorous test for the job's requirements.

3.  **Technical Depth**: Questions must be specific and probe for deep understanding, not surface-level knowledge. If the Job Description mentions core computer science fundamentals (e.g., data structures, algorithms, system design, databases), you MUST generate questions that test these fundamentals in a practical, scenario-based context.

4.  **Strategic Interviewer Notes**: For EVERY question, you MUST generate a concise \`interviewerNote\`. This note's purpose is to guide the interviewer on what to listen for, steering the evaluation towards practical application, business impact, and real-world problem-solving skills rather than just theoretical knowledge. It explains the 'why' behind the question. Each note MUST conclude with the exact sentence: "If the candidate provides relevant, practical answers, mark them accordingly. If the answer is partially correct, partial marks should be allocated."

5.  **Mix of Question Types**: The questions must cover a mix of:
    *   **Deep Conceptual Understanding**: e.g., "Explain how X works, why it’s important in practice, common pitfalls, how you’d apply it in production."
    *   **Technical Stack & Tools**: e.g., "How would you use library/tool Y for scenario Z?" (Draw tools from the JD and resume).
    *   **Real Project Scenarios**: e.g., "Describe a time you solved…", "How would you build…", "Suppose you encounter… what’s your debugging approach?"
    *   **Tradeoffs & Reasoning**: e.g., "Which algorithm would you pick for… why not the alternatives?", "How do you balance performance vs interpretability?"

6.  **Contextualization and Focus**:
    *   The vast majority of your questions (all but 2-3) MUST be derived solely from the technical requirements, skills, and responsibilities outlined in the **Job Description**. This is your primary source for question generation.
    *   Strictly limit resume-specific questions to 2-3 at most. These questions must directly reference a project or skill from the resume to verify their experience.
    *   The style must be at a technical level, not an HR level.

**MODEL ANSWER GENERATION (CRITICAL INSTRUCTION):**

For each question, you MUST provide a detailed \`modelAnswer\`. This is the most important part of your task.
*   **Format**: The \`modelAnswer\` MUST be a single string containing multiple evaluation points. Each point MUST be separated from the next by a triple newline ('\\n\\n\\n'). Each point MUST follow this format EXACTLY:
    \`A title for the evaluation point.\\n\\nA detailed, multi-paragraph explanation written as an expert would deliver it, referencing real tools, workflows, and best practices with deep technical reasoning. It must be a human, real-world style answer, not generic or superficial.\`
*   **Content**:
    *   The detailed explanation must be the **actual, detailed answer**, not a description of what the candidate should say.
    *   **CRITICAL: DO NOT use phrases that describe what the candidate should do (e.g., AVOID 'The candidate explains...', 'Describes how they...', 'Demonstrates understanding of...', or 'Provides examples of...'). Similarly, AVOID first-person narrative (e.g., AVOID 'I did this...', 'In my last project...'). Instead, write the actual, detailed answer itself as a generalized, expert-level explanation.**
    *   Where a question has multiple sub-parts, address each one in a dedicated evaluation point section.

**EXEMPLARY QUESTIONS AND MODEL ANSWERS (GUIDANCE FOR QUALITY):**

*   **Example 1 (Software Development):**
    *   **Question:** "Describe the concept of a binary search algorithm and its time complexity."
    *   **modelAnswer:** "Algorithm Definition.\\n\\nA binary search is an efficient algorithm for finding an element in a sorted array. It works by repeatedly dividing the search interval in half. It compares the target value to the middle element and eliminates half of the array from consideration in each step.\\n\\n\\nSearch Procedure.\\n\\nThe search begins by comparing the target to the middle element. If they are equal, the search is successful. If the target is smaller than the middle element, the search continues in the lower half of the array. If the target is larger, the search continues in the upper half. This process repeats until the element is found or the interval becomes empty.\\n\\n\\nTime Complexity Analysis.\\n\\nThe time complexity of binary search is O(log n). This is because the algorithm eliminates half of the remaining elements at each step, leading to a logarithmic number of comparisons in the worst case. This makes it significantly faster than a linear search (O(n)) for large datasets."

*   **Example 2 (DevOps):**
    *   **Question:** "Explain CI/CD in the context of DevOps."
    *   **modelAnswer:** "Continuous Integration (CI).\\n\\nCI is a practice where developers frequently merge code changes into a central repository, triggering automated builds and tests. The goal is to detect integration issues early. Each successful CI run produces a validated build artifact.\\n\\n\\nContinuous Delivery (CD).\\n\\nCD extends CI by ensuring that every change passing all tests is deployable to a production-like environment. The actual deployment to production remains a manual decision, but the software is always release-ready, reducing deployment risk.\\n\\n\\nContinuous Deployment.\\n\\nContinuous Deployment takes this a step further by automatically deploying every validated change to production without human intervention. This requires high confidence in the automated testing pipeline and enables multiple releases per day."

**FINAL OUTPUT:**
Organize the questions into 5-7 logical competencies. The vast majority of competencies MUST be technical. Also generate a scoring rubric based on the core skills required by the JD. Your response MUST be a single JSON object containing both the 'competencies' and 'scoringRubric' keys at the top level.
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
    if (!output) {
      throw new Error("AI failed to generate interview kit content.");
    }

     // Basic validation and default-filling for robustness
    const validatedOutput: GenerateInterviewKitOutput = {
      competencies: (output.competencies || []).map(comp => ({
        id: randomUUID(),
        name: comp.name || "Unnamed Competency",
        importance: comp.importance || "Medium",
        questions: (comp.questions || []).map(q => ({
          id: randomUUID(),
          question: q.question || "Missing question text",
          interviewerNote: q.interviewerNote || "Assess candidate based on their response clarity, depth, and relevance to the role.",
          modelAnswer: q.modelAnswer || "Missing model answer.",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || [])
        .filter(crit => crit && crit.name && typeof crit.weight === 'number')
        .map(crit => ({
          id: randomUUID(),
          name: crit.name!,
          weight: Math.max(0, Math.min(1, crit.weight!)),
      })),
    };

    // Ensure rubric weights sum to 1.0
    if (validatedOutput.scoringRubric && validatedOutput.scoringRubric.length > 0) {
        let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + (crit.weight || 0), 0);
        if (Math.abs(totalWeight - 1.0) > 0.001) {
            if (totalWeight === 0) { // If all weights are 0, distribute equally
                const equalWeight = 1.0 / validatedOutput.scoringRubric.length;
                validatedOutput.scoringRubric.forEach((crit) => {
                    crit.weight = equalWeight;
                });
            } else { // If weights are non-zero but don't sum to 1.0, normalize
                const factor = 1.0 / totalWeight;
                validatedOutput.scoringRubric.forEach(crit => {
                    crit.weight = (crit.weight || 0) * factor;
                });
            }

            // Final rounding pass to ensure perfect sum and avoid floating point issues
            let runningSum = 0;
            validatedOutput.scoringRubric.forEach((crit, index, arr) => {
                if (index < arr.length - 1) {
                    const roundedWeight = parseFloat((crit.weight || 0).toFixed(2));
                    crit.weight = roundedWeight;
                    runningSum += roundedWeight;
                } else {
                    // Assign the remainder to the last item
                    crit.weight = parseFloat(Math.max(0, 1.0 - runningSum).toFixed(2));
                }
            });
        }
    }

    return validatedOutput;
  }
);
