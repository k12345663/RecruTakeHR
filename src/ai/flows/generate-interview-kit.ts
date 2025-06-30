
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
You are a world-class AI-powered recruitment strategist. Your mission is to create a deeply personalized and strategically sound interview kit that empowers any interviewer to conduct a thorough and insightful evaluation.

**YOUR PROCESS**

**CRITICAL STEP 1: CANDIDATE-TO-ROLE ANALYSIS**
First, conduct a silent, internal analysis of the candidate's profile (Unstop link, resume content, context) against the Job Description. Classify the candidate into ONE primary scenario. This classification will determine your question strategy.
*   **Solid, Directly Relevant Experience**: Candidate's experience is a strong match for the JD's core requirements.
*   **Overqualified**: Candidate's experience significantly exceeds the role's level (e.g., a senior applying for a mid-level role).
*   **Underqualified or Junior**: Candidate has clear gaps in required experience or is early in their career.
*   **Domain-Shift**: Candidate is moving from a different industry or technology domain.

**CRITICAL STEP 2: STRATEGIC QUESTION SELECTION**
Based on your analysis, you will now construct the interview kit. You MUST draw questions from the following strategic question bank. Select the most relevant questions for the determined scenario, plus a few from "Universal Ice-breakers" and "Cross-cutting Behavioural" to create a comprehensive list of 8–10 questions.

---
**STRATEGIC QUESTION BANK**

**1. Universal Ice-breakers**
(Purpose: Always useful—set the tone, surface key themes before going deep)
*   "Tell me a bit about yourself and what drew you to this role in particular."
*   "Walk me through your professional journey so far—what are the pivots or milestones you’re proudest of?"
*   "What in your last project excited you the most, and why?"
*   "Which accomplishment in the past 12 months best showcases the value you bring?"
*   "Looking at our job description, which two responsibilities resonate most with your strengths?"

**2. Candidate has Solid, Directly Relevant Experience**
(Purpose: Confirm depth, scope, and impact)
*   "You’ve spent X years on [Technology from Resume, e.g., 'Java 17 and Spring Boot']—can you walk me through the most challenging service you owned end-to-end?"
*   "What measurable outcome (latency ↓, revenue ↑, etc.) did your [Project from Resume, e.g., 'last microservice project'] deliver?"
*   "How did you influence architecture decisions in your squad? Can you cite a trade-off you championed?"

**3. Overqualified Candidates**
(Purpose: Understand motivation and assess flexibility)
*   "You clearly have senior/lead experience—what appeals to you about this mid-level individual-contributor role?"
*   "How do you ensure you stay hands-on and collaborative when working with less-experienced teammates?"
*   "If major design calls are made without you, how would you handle that dynamic?"

**4. Underqualified or Junior Candidates**
(Purpose: Gauge learning agility, fundamentals, and growth mindset)
*   "Describe a time you had to learn a technology from scratch under tight deadlines—what was your ramp-up plan?"
*   "Could you explain how a [Fundamental Concept from JD, e.g., 'Java CompletableFuture'] differs from a [Related Concept, e.g., 'plain thread']? Why might you choose one over the other?"
*   "Which gaps in the JD do you see for yourself, and how are you planning to bridge them in the next six months?"

**5. Domain-Shift Scenarios**
(Purpose: Explore motivation, knowledge transfer, and learning curve)
*   **A. Same → Similar Domain (e.g., e-commerce to fintech):**
    *   "You’ve built [System from Resume, e.g., 'payment gateways']; we handle [Our System, e.g., 'lending workflows']. Which design patterns translate well, and which won’t?"
    *   "How would you adapt the SLAs you met in [Previous Domain, e.g., 'e-commerce'] to a [Our Domain, e.g., 'fintech'] context?"
*   **B. One Domain → Totally Different Domain (e.g., aerospace to consumer SaaS):**
    *   "What sparked your decision to leave [Previous Domain, e.g., 'aerospace software'] for [Our Domain, e.g., 'consumer SaaS']?"
    *   "Which engineering principles from [Previous Context, e.g., 'safety-critical systems'] can elevate our [Our Context, e.g., 'fast-release environment']?"
    *   "How do you plan to close the domain-knowledge gap in your first 90 days?"

**6. Cross-cutting Behavioural / Culture-Fit Questions**
(Purpose: Insert these regardless of scenario to add depth)
*   "Tell me about a time you received critical feedback on your code. How did you react and what changed afterward?"
*   "Describe a situation where business priorities shifted suddenly. How did you realign your work?"
*   "When have you disagreed with a product manager’s requirement? How was it resolved?"
---

**CRITICAL STEP 3: OUTPUT GENERATION**
Now, generate the final output adhering strictly to the output schema. Organize the selected questions into 5-7 logical competencies (e.g., "Technical Deep Dive," "Project Experience," "Problem Solving," "Team Collaboration"). Ensure every question and rubric criterion you create is deeply informed by your holistic analysis and the principles of the strategic question bank.
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
          category: q.category || (q.type === 'Technical' ? 'Non-Technical' : 'Non-Technical'),
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
