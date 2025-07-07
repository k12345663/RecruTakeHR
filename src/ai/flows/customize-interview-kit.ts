
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
    interviewerNote: z.string().describe("A brief, one-sentence note for the interviewer, explaining the strategic purpose of the question (e.g., 'This tests the candidate's ability to articulate the business impact...'). Refine this note based on user edits and the overall context. This note must not be visible to the candidate."),
    modelAnswer: z.string().describe("A \"Model Answer Guide\" for the interviewer, composed of MULTIPLE points (at least 3-4) to form a comprehensive checklist. Format this as a single string where each checklist point is separated by a double newline ('\\n\\n'). Each point MUST follow this format EXACTLY: A title for the evaluation point (e.g., 'Explains it is Object Oriented'), followed by a newline, then 'Sample:', a newline, and then a very detailed, multi-sentence explanation. This explanation must be a high-quality, legitimate answer to the point, written to educate a non-technical interviewer. It MUST NOT be an instruction about what the candidate should say (e.g., AVOID 'The candidate should explain...')."),
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
    name: z.string().describe("Name of the high-quality, distinct criterion. It MUST be actionable, measurable, and extremely specific, explicitly mentioning key technologies, skills, or domain-specific concepts found in the Job Description AND supported by evidence in the Candidate's Resume/Context. The set of criteria must provide a deep, contextual basis for evaluating technical and domain expertise."),
    weight: z.number().describe("Weight of the criterion (a value between 0.0 and 1.0). Ensure weights for all criteria sum to 1.0."),
});

const CustomizeInterviewKitInputSchema = z.object({
    jobDescription: z.string().describe("Original job description for context."),
    unstopProfileLink: z.string().describe("Original Unstop Profile link for context. Treat as if accessing the live profile."),
    candidateResumeDataUri: z.string().optional().describe("The full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. You MUST analyze it with extreme depth as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. Your refinements depend on this deep analysis."),
    candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
    candidateExperienceContext: z.string().optional().describe("Original candidate experience context notes."),
    competencies: z.array(CompetencySchema).describe("The current list of competencies, including any user edits to names, importance, or questions."),
    scoringRubric: z.array(RubricCriterionSchema).describe("The current list of rubric criteria, including any user edits to names or weights."),
});

export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

// The output schema is the same as the editable parts of the input
const CustomizeInterviewKitOutputSchema = z.object({
    competencies: z.array(CompetencySchema),
    scoringRubric: z.array(RubricCriterionSchema),
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
You are a world-class AI-powered recruitment strategist, acting as an expert technical interviewer. Your primary goal is to intelligently refine an existing, user-edited interview kit. You must ensure every question is a **direct, technical probe** that tests real-world skills, not a generic or philosophical one.

**CRITICAL CONTEXT: Before making any refinements, you MUST FIRST THOROUGHLY analyze and synthesize ALL provided inputs. The resume, if provided, is your most important document.**

**1. Original Context (The Candidate and The Role):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your refinements must be heavily influenced by the specific details within this resume.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**2. User's Edits (The Current State of the Interview Kit):**
*   **Competencies & Questions**: You will be provided with the current list of competencies and their questions.
*   **Scoring Rubric**: You will be provided with the current scoring rubric.

YOUR TASK:
Intelligently refine the provided interview kit. Respect the user's edits, but use your expert judgment to enhance overall quality, consistency, and strategic alignment based on the candidate's profile.

REFINEMENT PRINCIPLES (Apply these while refining):
- **Focus on Direct, Technical Probing**: This is your most important principle. When refining questions, steer them away from being generic or philosophical. If a user edits a question to be "Why did you choose React?", you MUST refine it into a more direct probe, such as "In your React project, can you describe a specific custom hook you built and the problem it solved?" or "Walk me through how you managed state in your most complex React application." Ensure every question tests one of the core technical areas: Conceptual Understanding, Practical Application, Problem Solving, Optimization, Best Practices, Debugging, or Scalability/Security.
- **Balance Project-Specific vs. General Questions**: While questions grounded in the candidate's specific projects are valuable, ensure the overall kit maintains a healthy balance. An ideal kit has only 2-3 project-specific questions. When refining, gently guide the question set towards this balance, unless the user's edits clearly indicate a desire for a deep-dive on a particular project.
- **Ground in Evidence**: All refinements must be grounded in the provided context (JD, Resume). If you reference a skill or project, it MUST be present in the source documents. Do not hallucinate. When refining questions, do not explicitly mention "the job description." Phrase questions observationally (e.g., "I noticed on your resume...") or probe for skills without referencing the JD.
- **Expand Model Answers**: When refining, ensure each \`modelAnswer\` is a comprehensive guide for the interviewer. It must contain at least 3-4 distinct evaluation points. Each point is a checklist item, with all points formatted into a single string separated by a double newline ('\\n\\n'). The format for EACH point MUST BE: a title for the evaluation point, followed by a newline, then 'Sample:', a newline, and then a very detailed, multi-sentence explanation of the technical concept for the recruiter to read. This explanation must be a legitimate, high-quality, generalized answer that provides deep technical context. **ABSOLUTELY DO NOT write what the candidate should do (e.g., 'The candidate should explain...'). Instead, PROVIDE THE ACTUAL TECHNICAL EXPLANATION.** For example, a perfect point would be: "Explains Object-Oriented Principles\\nSample:\\nJava is an object-oriented language built on four core principles: Encapsulation, which bundles data and methods within a class; Inheritance, which allows a new class to acquire properties from an existing one; Polymorphism, which enables methods to perform different actions based on the object; and Abstraction, which hides complexity by showing only essential features. These concepts make code modular and reusable."
- **Maintain Crisp, Professional Language**: Ensure all questions are concise, clear, and professional. Refine any user edits that are verbose or unclear.
- **Validate Classifications**: If a user's edits to a question's content make its existing \`type\`, \`category\`, or \`difficulty\` classification incorrect, you MUST update these fields to reflect the new reality.
- **Preserve IDs**: Preserve the \`id\` fields for all competencies, questions, and rubric criteria exactly as they are in the input.

Refine the content based on the user's changes and your expert judgment to produce a polished, final version of the kit.
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
        let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
        if (validatedOutput.scoringRubric.length > 0 && Math.abs(totalWeight - 1.0) > 0.001) {
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

        return validatedOutput;
    }
);
