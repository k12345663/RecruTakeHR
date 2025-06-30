
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
    question: z.string().describe("The interview question. It must be refined to validate and probe the depth of skills and experiences claimed on the resume. Instead of just asking if they know a technology, the question should ask them to demonstrate their expertise with specific examples of challenges, architectural decisions, or complex problems they solved. The question must remain insightful and highly specific, directly derived from projects or skills mentioned in the Candidate's Unstop Profile, Resume File, and the Job Description."),
    modelAnswer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE, presented as 3-4 concise bullet points. These bullet points for the recruiter must be very brief and crisp, ideally just a few key words or a very short phrase, serving as a quick checklist of essential elements the candidate should touch upon. Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it exceptionally easy for a non-technical recruiter to judge. While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid baseline for evaluation. Answers must be basic, clear, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content when crucial for context. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. This textual guidance is to help the panelist understand the relative importance of each point when they assign their overall 1-10 score for the question using the slider. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For the 'Tell me about yourself' question: the model answer MUST be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate."),
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
    name: z.string().describe("Name of the high-quality, distinct criterion. It MUST be actionable, measurable, and explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Context (including specific project details, educational background, academic achievements, and past work experiences). The set of criteria should provide a broad yet deeply contextual basis for evaluating the candidate comprehensively, usable by a non-technical recruiter."),
    weight: z.number().describe("Weight of the criterion (a value between 0.0 and 1.0). Ensure weights for all criteria sum to 1.0."),
});

const CustomizeInterviewKitInputSchema = z.object({
    jobDescription: z.string().describe("Original job description for context."),
    unstopProfileLink: z.string().optional().describe("Original Unstop Profile link for context. Treat as if accessing the live profile."),
    candidateResumeDataUri: z.string().optional().describe("The full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. Analyze it deeply as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences."),
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

**CRITICAL CONTEXT: Before making any refinements, you MUST FIRST THOROUGHLY analyze and synthesize ALL provided inputs:**

**1. Original Context (The Candidate and The Role):**
*   **Job Description**: {{{jobDescription}}}
{{#if unstopProfileLink}}*   **Unstop Profile Link**: {{{unstopProfileLink}}}{{/if}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}}{{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**2. User's Edits (The Current State of the Interview Kit):**
*   **Competencies & Questions**: You will be provided with the current list of competencies and their questions.
*   **Scoring Rubric**: You will be provided with the current scoring rubric.

This combined context helps you understand the candidate's likely scenario (e.g., overqualified, junior, domain-shifter) and the user's intent.

YOUR TASK:
Intelligently refine the provided interview kit. Respect the user's edits, but use your expert judgment to enhance overall quality, consistency, and strategic alignment based on the candidate's profile and the underlying recruitment scenario.

REFINEMENT PRINCIPLES (Apply these while refining):
- **Maintain Crisp, Professional Language**: Ensure all questions are concise, clear, and maintain a professional tone suitable for a top-tier recruiter. Refine any user edits that are verbose or unclear.
- **Verify, Don't Just Accept**: When refining a question about a skill on the resume, ensure the question is phrased to *test the depth* of that skill. Push for examples of complex implementations, trade-off decisions, or problem-solving that goes beyond surface-level knowledge.
- **Ground in Evidence**: All refinements, especially to questions and rubric criteria, must be grounded in the provided context. If you add a reference to a skill, project, or requirement, it MUST be present in the Job Description or the candidate's profile/resume. Do not hallucinate or assume information.
- **Maintain Strategic Intent**: When refining a question or its model answer, consider the underlying recruitment scenario. For example, if you infer the candidate is overqualified, ensure your refined guidance for a question like "What are your career goals?" helps the interviewer probe for alignment with a less senior role, even if the user just made a minor text edit.
- **Experience Nuances (Years vs. Impact)**: If the user edits a question about experience, ensure the refined answer guidance still helps the interviewer evaluate the quality and impact of project work over just formal years. For example, a candidate with 3 years of experience who led 2 major projects might be stronger than a candidate with 5 years in a maintenance role.
- **Skill & Technology Transferability**: When a candidate has experience in a related but different technology (e.g., OpenAI API vs. Gemini API), ensure questions and answer guidance effectively probe for their understanding of core principles and their ability to adapt and learn.
- **Bridging Background & Domain Differences**: Maintain a focus on adaptability and learning strategy when refining questions for candidates transitioning industries (e.g., gaming to fintech) or from academia.
- **Handling Career History Nuances**: If a question relates to a career gap, frequent job changes, or an ambiguous title, ensure the model answer guidance helps the interviewer assess the situation constructively, looking for self-awareness, proactive learning, and clear motivation.
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
                    modelAnswer: q.modelAnswer || "Missing model answer. (Guidance: For the interviewer, list 3-4 brief, crisp bullet points of key elements a strong candidate should cover, with indicative marks for each, e.g., 'approx. 2-3 points'. Note how to evaluate off-resume info.)",
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
