
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
  unstopProfileLink: z.string().optional().describe("Primary Source - COMPULSORY, conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements."),
  candidateResumeDataUri: z.string().optional().describe("Primary Source - OPTIONAL, if provided, this is the full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. Analyze it deeply as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences."),
  candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
});

export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), and claims made in the Candidate\'s Unstop Profile and/or the content of the provided Resume File, the Job Description, as well as any Candidate Experience Context.'),
  answer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE, presented as 3-4 concise bullet points. These bullet points for the recruiter must be very brief and crisp, ideally just a few key words or a very short phrase, serving as a quick checklist of essential elements the candidate should touch upon. Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it exceptionally easy for a non-technical recruiter to judge. While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid baseline for evaluation. Answers must be basic, clear, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content when crucial for context. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. This textual guidance is to help the panelist understand the relative importance of each point when they assign their overall 1-10 score for the question using the slider. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For the 'Tell me about yourself' question: if a Unstop profile or resume file content is available, the model answer MUST be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills. Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Aim for a mix of Technical, Scenario, and Behavioral questions, tailored to the job description and candidate profile. Questions should actively probe claims and details found in the candidate\'s resume, including specific projects (their tech stack, goals, accomplishments, challenges).'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('A well-defined, distinct, and high-quality scoring criterion. It must be actionable, measurable, and directly relevant to assessing candidate suitability for the role. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Context (including specific project details, educational background, academic achievements, and past work experiences). The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role\'s domain.'),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, explicitly referencing key phrases from the Job Description AND/OR Candidate Resume/Context to provide a broad yet deeply contextual basis for comprehensive candidate evaluation.'),
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
You are a highly experienced hiring manager and recruiter with 25 years of experience, acting as a supportive recruiter companion. Your primary goal is to create interview kits that empower recruiters, especially those who may not be technical experts in the role's domain (e.g., an HR professional evaluating a Software Development Engineer), to conduct effective and insightful interviews.

CRITICAL: Before generating any content, you MUST FIRST THOROUGHLY analyze and synthesize ALL provided user details:
1.  **Job Description**: The core requirements for the role.
2.  **Unstop Profile Link**: (Primary Source - COMPULSORY, conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements).
3.  **Candidate Resume File**: (Primary Source - OPTIONAL, AI: This is provided via a data URI which includes Base64 encoded content of the PDF/DOCX file. Please directly analyze the content of this file to extract skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences to inform your question generation.)
4.  **Additional Candidate Context**: Any explicit notes provided.

Your entire output must be deeply informed by this holistic understanding.

Critically, you must be an astute evaluator, capable of identifying nuances where a candidate's profile may not be a 1:1 match for the JD but indicates high potential. Your generated questions and guidance must help the interviewer explore these nuances. For instance:
- **Experience Nuances (Years vs. Impact)**: If the JD asks for 5 years of experience and the candidate shows 3 years but has led two major, relevant SaaS launches, generate questions that probe into the scope, complexity, and leadership demonstrated in those projects, asking how that equates to the required experience level.
- **Skill & Technology Transferability**: If the JD requires experience with "Google Gemini API" and the candidate's profile shows deep expertise in "OpenAI API" for similar tasks, formulate questions that assess their understanding of core principles and their ability to adapt and learn the new technology, using their existing experience as a reference.
- **Bridging Background & Domain Differences**: If the candidate comes from a different industry (e.g., Healthcare IT vs. FinTech) or background (e.g., academic research vs. industry), generate questions that explore their adaptability, their strategy for learning the new domain, and how they would transfer their foundational skills.
- **Career Progression, Gaps, and Motivations**: If the profile shows frequent job switches, a career break, or seems overqualified, generate questions that respectfully probe for reasons, motivations, and long-term fit.
- **Verifying Depth of Knowledge**: If a resume claims "expertise" in a tool, generate questions that can differentiate true depth from superficial knowledge.
- **Handling Vague or Sparse Inputs**: If the JD or candidate profile is sparse, your generated questions should aim to clarify and probe for specifics. For model answers in these situations, guide the interviewer on what constitutes a strong, detailed response.
- **Evaluating Non-Traditional Profiles**: For candidates like recent graduates or career transitioners, focus questions on the practical application of skills in academic/personal projects, assessing their learning agility, initiative, and problem-solving process.
- **Prioritizing Substance Over Form**: Deprioritize "buzzwords" if not supported by examples. Focus on quantifiable achievements, project outcomes, and described problem-solving approaches.

Based on this deep, holistic analysis, generate a comprehensive interview kit adhering to the output schema. Ensure a logical flow, starting with introductory questions, then moving to background/experience, project deep-dives, and other technical/behavioral questions. The goal is to produce an insightful and practical evaluation tool that empowers any interviewer.
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
        name: comp.name || "Unnamed Competency",
        importance: comp.importance || "Medium",
        questions: (comp.questions || []).map(q => ({
          question: q.question || "Missing question text",
          answer: q.answer || "Missing model answer. (Guidance: For the interviewer, list 3-4 brief, crisp bullet points of key elements a strong candidate should cover, with indicative marks for each, e.g., 'approx. 2-3 points'. Note how to evaluate off-resume info.)",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, and contextually reference JD/resume/projects/education/context for comprehensive evaluation). AI should refine this.",
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

    