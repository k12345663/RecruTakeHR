
'use server';

/**
 * @fileOverview An interview kit customization AI agent.
 *
 * - customizeInterviewKit - A function that handles the interview kit customization process.
 * - CustomizeInterviewKitInput - The input type for the customizeInterviewKit function.
 * - CustomizeInterviewKitOutput - The return type for the customizeInterviewKit function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { QuestionDifficulty } from '@/types/interview-kit'; // For difficultyTimeMap

// This map is used in post-processing if AI doesn't provide estimatedTimeMinutes
const difficultyTimeMap: Record<QuestionDifficulty, number> = {
  Naive: 2,
  Beginner: 4,
  Intermediate: 6,
  Expert: 8,
  Master: 10,
};

const QuestionSchema = z.object({
    id: z.string().describe("The unique identifier for the question. This must be preserved from the input."),
    question: z.string().describe("A crisp, direct, and deeply technical interview question, ONE or TWO lines at most. The question MUST AVOID being generic or philosophical (e.g., avoid \"What's the difference between X and Y?\"). Instead, it should be a practical probe designed to test hands-on expertise in one of the core technical areas: Conceptual Understanding, Practical Application, Problem Solving, Optimization, Best Practices, Debugging, or Scalability/Security. The question must be insightful and highly specific, directly derived from projects, skills, or achievements mentioned in the Candidate's Unstop Profile and Resume. Do NOT include the candidate's name in the question itself."),
    interviewerNote: z.string().describe("A brief, one-sentence note for the interviewer, explaining the strategic purpose of the question (e.g., 'This tests the candidate's ability to articulate the business impact...'). Refine this note based on user edits and the overall context. This note must not be visible to the candidate. Each note MUST conclude with the exact sentence: \"If the candidate provides relevant, practical answers, mark them accordingly. If the answer is partially correct, partial marks should be allocated.\""),
    modelAnswer: z.string().describe("A \"Model Answer Guide\" for the interviewer, composed of MULTIPLE points (at least 3-4) to form a comprehensive checklist. Format this as a single string where each checklist point is separated by a triple newline ('\\n\\n\\n'). Each point MUST follow this format EXACTLY: `A title for the evaluation point.\\n\\nA detailed, multi-paragraph explanation written as an expert would deliver it, referencing real tools, workflows, and best practices with deep technical reasoning. It must be a human, real-world style answer, not generic or superficial.` CRITICAL: DO NOT use phrases that describe what the candidate should do (e.g., AVOID 'The candidate explains...', 'Describes how they...'). Similarly, AVOID first-person narrative (e.g., AVOID 'I did this...'). Instead, write the actual, detailed answer itself as a generalized, expert-level explanation."),
    type: z.enum(['Technical', 'Scenario', 'Behavioral']),
    category: z.enum(['Technical', 'Non-Technical']),
    difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']),
    estimatedTimeMinutes: z.number().describe("Refined time estimate based on user edits to difficulty or time itself."),
});

const CompetencySchema = z.object({
    id: z.string().describe("The unique identifier for the competency. This must be preserved from the input."),
    name: z.string().describe("The name of the competency. Refine based on user edits."),
    importance: z.enum(['High', 'Medium', 'Low']).describe("The importance of the competency. Refine based on user edits."),
    questions: z.array(QuestionSchema).describe("The list of questions for this competency. Refine based on user edits."),
});

const RubricCriterionSchema = z.object({
    id: z.string().describe("The unique identifier for the criterion. This must be preserved from the input."),
    name: z.string().describe("A well-defined, distinct, and high-quality scoring criterion. It must be actionable, measurable, and directly relevant to the role, explicitly mentioning key technologies or skills from the Job Description and Resume."),
    weight: z.number().describe("Weight of the criterion (a value between 0.0 and 1.0). Ensure weights for all criteria sum to 1.0."),
});

const CustomizeInterviewKitInputSchema = z.object({
    jobDescription: z.string().describe("Original job description for context."),
    unstopProfileLink: z.string().describe("Original Unstop Profile link for context. Treat as if accessing the live profile."),
    candidateResumeDataUri: z.string().optional().describe("The full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. You MUST analyze it with extreme depth as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. Your refinements depend on this deep analysis."),
    candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
    candidateExperienceContext: z.string().optional().describe("Original candidate experience context notes."),
    competencies: z.array(CompetencySchema).describe("The current list of competencies, including any user edits to names, importance, or questions."),
    scoringRubric: z.array(RubricCriterionSchema).optional().describe("The current list of rubric criteria, including any user edits to names or weights."),
});

export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

// The output schema is the same as the editable parts of the input
const CustomizeInterviewKitOutputSchema = z.object({
    competencies: z.array(CompetencySchema),
    scoringRubric: z.array(RubricCriterionSchema).optional(),
});

export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
    return customizeInterviewKitFlow(input);
}

const customizeInterviewKitPrompt = ai.definePrompt({
    name: 'customizeInterviewKitPrompt',
    input: { schema: CustomizeInterviewKitInputSchema },
    output: { schema: CustomizeInterviewKitOutputSchema },
    prompt: `
You are a world-class AI-powered recruitment strategist. Your primary goal is to intelligently refine an existing, user-edited interview kit for various roles including **Software Development, DevOps, Data Science, Finance, and Sales**. You must act as an expert technical interviewer for the specific domain of the provided job description.

**CRITICAL CONTEXT: Before making any refinements, you MUST FIRST THOROUGHLY analyze and synthesize ALL provided inputs. The resume, if provided, is your most important document.**

**1. Original Context (The Candidate and The Role):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your refinements must be heavily influenced by the specific details within this resume.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**2. User's Edits (The Current State of the Interview Kit):**
*   **Competencies & Questions**: You will be provided with the current list of competencies and their questions, which may have been edited by the user.
*   **Scoring Rubric**: You will be provided with the current scoring rubric, which may have been edited by the user.

**YOUR TASK: INTELLIGENTLY REFINE THE INTERVIEW KIT TO BE DEEPLY TECHNICAL**

Intelligently refine the provided interview kit. Your primary goal is to ensure the final kit is **as technical as possible**. Respect the user's edits, but use your expert judgment to enhance overall quality, consistency, and strategic alignment based on the candidate's profile and the role's requirements.

**REFINEMENT PRINCIPLES (Apply these while refining):**

1.  **Calibrate to Experience Level**: Your first priority is to ensure the difficulty and nature of the questions are appropriate for the candidate's experience level as described in the context. If a user's edit makes a question too simple for a senior candidate (e.g., "What is Python?"), you MUST refine it to be more advanced (e.g., "Describe how Python's GIL affects concurrent programming and what strategies you'd use to mitigate it in a high-throughput data pipeline."). Conversely, if a question is too complex for a junior role, simplify it to test foundational knowledge.

2.  **Maintain Role Focus**: Your primary goal is to ensure the question kit evaluates fitness for the role defined in the **Job Description**. When refining, the resume should be used for context and for tailoring **a maximum of two (2) questions** to probe specific experiences. Avoid letting the kit become a simple review of the resume; it must remain a rigorous test for the job's requirements.

3.  **Focus on Direct, Technical Probing**: This is your most important principle. When refining user-edited questions, steer them away from being generic or philosophical. If a user edits a question to be "Why did you choose React?" or a generic behavioral question, you MUST refine it into a direct, technical probe, such as "In your React project, can you describe a specific custom hook you built and the problem it solved?" or "Walk me through how you managed state in your most complex React application." Ensure every question tests one of the core technical areas: Conceptual Understanding, Practical Application, Problem Solving, Optimization, Best Practices, Debugging, or Scalability/Security. This includes ensuring that questions about core computer science fundamentals (like data structures or algorithms), if relevant to the JD, are practical and scenario-based, not just theoretical definitions.

4.  **Ground in Evidence**: All refinements must be grounded in the provided context (JD, Resume). If you reference a skill or project, it MUST be present in the source documents. Do not hallucinate.

5.  **Strategic Interviewer Notes**: For every question, you MUST have an insightful \`interviewerNote\`. Refine the existing note to be sharp and strategic. It should clearly explain to the interviewer what to look for in a great answer, focusing on practical application, problem-solving skills, and the ability to connect technical details to business outcomes. Each note MUST conclude with the exact sentence: "If the candidate provides relevant, practical answers, mark them accordingly. If the answer is partially correct, partial marks should be allocated."

6.  **GENERATE GOLD-STANDARD MODEL ANSWERS**: When refining a question or its answer, ensure the \`modelAnswer\` is a comprehensive guide for the interviewer, following the same high standards as the initial generation.
    *   **Format**: The \`modelAnswer\` MUST be a single string containing multiple evaluation points, separated by a triple newline ('\\n\\n\\n'). Each point MUST follow this format EXACTLY: \`A title for the evaluation point.\\n\\nA detailed, multi-paragraph explanation written as an expert would deliver it, referencing real tools, workflows, and best practices with deep technical reasoning. It must be a human, real-world style answer, not generic or superficial.\`
    *   **Content**: The detailed explanation must be the **actual, detailed answer**, not a description of what the candidate should say. **CRITICAL: DO NOT use phrases that describe what the candidate should do (e.g., AVOID 'The candidate explains...', 'Describes how they...', 'Demonstrates understanding of...', or 'Provides examples of...'). Similarly, AVOID first-person narrative (e.g., AVOID 'I did this...', 'In my last project...'). Instead, write the actual, detailed answer itself as a generalized, expert-level explanation.**

7.  **Maintain Crisp, Professional Language**: Ensure all questions are concise, clear, and professional. Refine any user edits that are verbose or unclear.

8.  **Validate Classifications**: If a user's edits to a question's content make its existing \`type\`, \`category\`, or \`difficulty\` classification incorrect, you MUST update these fields to reflect the new reality. Prioritize 'Technical' and 'Scenario' types.

9.  **Preserve IDs**: Preserve the \`id\` fields for all competencies, questions, and rubric criteria exactly as they are in the input.

**EXEMPLARY QUESTIONS AND MODEL ANSWERS (GUIDANCE FOR QUALITY):**

*   **Example 1 (Software Development):**
    *   **Question:** "Describe the concept of a binary search algorithm and its time complexity."
    *   **modelAnswer:** "Algorithm Definition.\\n\\nA binary search is an efficient algorithm for finding an element in a sorted array. It works by repeatedly dividing the search interval in half. It compares the target value to the middle element and eliminates half of the array from consideration in each step.\\n\\n\\nSearch Procedure.\\n\\nThe search begins by comparing the target to the middle element. If they are equal, the search is successful. If the target is smaller than the middle element, the search continues in the lower half of the array. If the target is larger, the search continues in the upper half. This process repeats until the element is found or the interval becomes empty.\\n\\n\\nTime Complexity Analysis.\\n\\nThe time complexity of binary search is O(log n). This is because the algorithm eliminates half of the remaining elements at each step, leading to a logarithmic number of comparisons in the worst case. This makes it significantly faster than a linear search (O(n)) for large datasets."

*   **Example 2 (DevOps):**
    *   **Question:** "Explain CI/CD in the context of DevOps."
    *   **modelAnswer:** "Continuous Integration (CI).\\n\\nCI is a practice where developers frequently merge code changes into a central repository, triggering automated builds and tests. The goal is to detect integration issues early. Each successful CI run produces a validated build artifact.\\n\\n\\nContinuous Delivery (CD).\\n\\nCD extends CI by ensuring that every change passing all tests is deployable to a production-like environment. The actual deployment to production remains a manual decision, but the software is always release-ready, reducing deployment risk.\\n\\n\\nContinuous Deployment.\\n\\nContinuous Deployment takes this a step further by automatically deploying every validated change to production without human intervention. This requires high confidence in the automated testing pipeline and enables multiple releases per day."

Now, refine the content based on the user's changes and your expert judgment to produce a polished, final version of the kit. Your response MUST be a single JSON object containing both the 'competencies' and 'scoringRubric' keys at the top level.
`,
});

const customizeInterviewKitFlow = ai.defineFlow(
    {
        name: 'customizeInterviewKitFlow',
        inputSchema: CustomizeInterviewKitInputSchema,
        outputSchema: CustomizeInterviewKitOutputSchema,
    },
    async (input) => {
        const { output } = await customizeInterviewKitPrompt(input);
        if (!output) {
            throw new Error("AI failed to customize interview kit content.");
        }

        // Basic validation and default-filling for robustness
        const validatedOutput: CustomizeInterviewKitOutput = {
            competencies: (output.competencies || []).map(comp => ({
                id: comp.id, // Preserve ID
                name: comp.name || "Unnamed Competency",
                importance: comp.importance || "Medium",
                questions: (comp.questions || []).map(q => ({
                    id: q.id, // Preserve ID
                    question: q.question || "Missing question text",
                    interviewerNote: q.interviewerNote || "Assess candidate based on their response clarity, depth, and relevance to the role.",
                    modelAnswer: q.modelAnswer || "Missing model answer.",
                    type: q.type || "Behavioral",
                    category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
                    difficulty: q.difficulty || "Intermediate",
                    estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
                })),
            })),
            scoringRubric: (output.scoringRubric || []).map(crit => ({
                id: crit.id, // Preserve ID
                name: crit.name || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, and contextually reference JD/resume/projects/education/context for comprehensive evaluation). AI should refine this.",
                weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
            })),
        };

        // Ensure rubric weights sum to 1.0
        if (validatedOutput.scoringRubric && validatedOutput.scoringRubric.length > 0) {
            let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
            if (Math.abs(totalWeight - 1.0) > 0.001) {
                if (totalWeight === 0) { // If all weights are 0, distribute equally
                    const equalWeight = 1.0 / validatedOutput.scoringRubric.length;
                    validatedOutput.scoringRubric.forEach((crit, index) => {
                        crit.weight = equalWeight;
                    });
                } else { // If weights are non-zero but don't sum to 1.0, normalize
                    const factor = 1.0 / totalWeight;
                    validatedOutput.scoringRubric.forEach(crit => {
                        crit.weight *= factor;
                    });
                }
                
                // Final rounding pass to ensure perfect sum and avoid floating point issues
                let runningSum = 0;
                validatedOutput.scoringRubric.forEach((crit, index, arr) => {
                    if (index < arr.length - 1) {
                        const roundedWeight = parseFloat(crit.weight.toFixed(2));
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
