
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
    question: z.string().describe("The interview question. It must be refined to be crisp and concise, ONE or TWO lines at most. The question MUST be deeply technical and domain-specific, designed to validate and probe the depth of skills claimed on the resume, connecting them to the Job Description's requirements. Instead of just asking if they know a technology, the question should ask them to demonstrate their expertise with specific examples of architectural decisions, complex technical challenges they solved, or how their work delivered specific business outcomes. The question must remain insightful and highly specific, directly derived from projects or skills mentioned in the Candidate's Unstop Profile and Resume. Do NOT include the candidate's name in the question itself."),
    interviewerNote: z.string().describe("A brief, one-sentence note for the interviewer, explaining the strategic purpose of the question (e.g., 'This tests the candidate's ability to articulate the business impact...'). Refine this note based on user edits and the overall context. This note must not be visible to the candidate."),
    modelAnswer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE. This is not for the candidate; it is a guide for the interviewer to judge the answer. Refer to the person being interviewed as 'the candidate'. The answer MUST be comprehensive and structured so that a non-technical recruiter can understand the key points. Format it as structured text, NOT a simple bulleted list. Break it into 2-4 distinct, titled sections. Each section MUST start with a bolded title and its indicative point value, e.g., '**Concept Explanation (approx. 3 points)**'. Underneath the title, provide a detailed explanation of the concept, potentially including its own sub-list of items using hyphens. This explanation must be rich and cover the 'what,' 'why,' and 'how' of the topic, as if teaching it to an intelligent colleague who is not an expert in this specific field. The final output MUST resemble this structure: '**Section 1 Title (approx. X points)**\\nDetailed explanation for section 1...\\n\\n**Section 2 Title (approx. Y points)**\\nDetailed explanation for section 2...'. A final 'Note:' section on evaluating real-life examples should be included at the end. For the 'Tell me about yourself' question, the model answer MUST remain a guide for the interviewer, outlining key points from the candidate's specific background that constitute a strong introduction."),
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
You are a world-class AI-powered recruitment strategist, acting as a supportive recruiter companion. Your primary goal is to intelligently refine an existing, user-edited interview kit. Your main directive is to ensure every question effectively validates the candidate's claimed skills and experience, pushing for depth and specific examples rather than simple confirmations.

**CRITICAL CONTEXT: Before making any refinements, you MUST FIRST THOROUGHLY analyze and synthesize ALL provided inputs. The resume, if provided, is your most important document.**

**1. Original Context (The Candidate and The Role):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your refinements must be heavily influenced by the specific details within this resume.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**2. User's Edits (The Current State of the Interview Kit):**
*   **Competencies & Questions**: You will be provided with the current list of competencies and their questions.
*   **Scoring Rubric**: You will be provided with the current scoring rubric.

This combined context helps you understand the candidate's likely scenario (e.g., overqualified, junior, domain-shifter) and the user's intent.

YOUR TASK:
Intelligently refine the provided interview kit. Respect the user's edits, but use your expert judgment to enhance overall quality, consistency, and strategic alignment based on the candidate's profile and the underlying recruitment scenario.

REFINEMENT PRINCIPLES (Apply these while refining):
- **Maintain Crisp, Professional Language**: Ensure all questions are concise, clear, and maintain a professional tone suitable for a top-tier recruiter. Questions should be direct and not overly long. Refine any user edits that are verbose or unclear.
- **Verify, Don't Just Accept**: When refining a question about a skill on the resume, ensure the question is phrased to *test the depth* of that skill. Push for examples of complex implementations, trade-off decisions, or problem-solving that goes beyond surface-level knowledge.
- **Ground in Evidence**: All refinements, especially to questions and rubric criteria, must be grounded in the provided context. If you add a reference to a skill, project, or requirement, it MUST be present in the Job Description or, most importantly, the candidate's profile/resume. Do not hallucinate or assume information. **Crucially, when refining questions, do not explicitly mention "the job description" or what "the role requires". Phrase questions observationally (e.g., "I noticed on your resume...") or probe for skills without referencing the JD directly.**
- **Maintain Strategic Intent**: When refining a question or its model answer, consider the underlying recruitment scenario. For example, if you infer the candidate is overqualified, ensure your refined guidance for a question like "What are your career goals?" helps the interviewer probe for alignment with a less senior role, even if the user just made a minor text edit.
- **Probe for Growth Mindset**: When refining questions, especially behavioral ones, ensure they still effectively probe the candidate's learning strategies, their reaction to feedback, and their resilience in the face of failure or ambiguity. This is crucial for assessing adaptability.
- **Experience Nuances (Years vs. Impact)**: If the user edits a question about experience, ensure the refined answer guidance still helps the interviewer evaluate the quality and impact of project work over just formal years. For example, a candidate with 3 years of experience who led 2 major projects might be stronger than a candidate with 5 years in a maintenance role.
- **Skill & Technology Transferability**: When a candidate has experience in a related but different technology (e.g., OpenAI API vs. Gemini API), ensure questions and answer guidance effectively probe for their understanding of core principles and their ability to adapt and learn.
- **Bridging Background & Domain Differences**: Maintain a focus on adaptability and learning strategy when refining questions for candidates transitioning industries (e.g., gaming to fintech), from one role type to another (e.g., a technical expert to a sales manager), or from academia.
- **Handling Career History Nuances**: If a question relates to a career gap, frequent job changes, or an ambiguous title, ensure the model answer guidance helps the interviewer assess the situation constructively, looking for self-awareness, proactive learning, and clear motivation.
- **Validate Classifications**: Ensure that every question has an appropriate \`type\`, \`category\`, and \`difficulty\` assigned. If the user's edits to a question's content make the existing classification incorrect (e.g., changing a behavioral question to be highly technical), you MUST update these fields to reflect the new reality.
- **Evaluating Non-Traditional Profiles**: For candidates like recent graduates or those from different fields (e.g., physics PhD for a data science role), ensure that even after user edits, the questions focus on the practical application of transferable skills demonstrated in projects or research.
- **Prioritizing Substance Over Form**: When refining, continue to deprioritize "buzzwords" and focus on quantifiable achievements and problem-solving.
- **Ensuring Question & Content Variety**: If a user adds a question that is very similar to an existing one, you can subtly rephrase one of them to ensure variety.

Preserve the \`id\` fields for all competencies, questions, and rubric criteria exactly as they are in the input. Refine the content based on the user's changes and your expert judgment to produce a polished, final version of the kit.
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
