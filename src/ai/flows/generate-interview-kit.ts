
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
  unstopProfileLink: z.string().describe("Primary Source - COMPULSORY, conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements."),
  candidateResumeDataUri: z.string().optional().describe("Primary Source - OPTIONAL, but CRUCIAL if provided. This is the full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. You MUST analyze it with extreme depth as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. The quality of your questions depends on this deep analysis."),
  candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
});

export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe("A crisp and concise interview question. It must be designed to validate and probe the depth of skills and experiences claimed on the resume. Instead of just asking if they know a technology, ask them to demonstrate their expertise with specific examples of challenges, architectural decisions, or complex problems they solved. The question must be insightful and highly specific, directly derived from projects or skills mentioned in the Candidate's Unstop Profile and, most importantly, the Resume File. Every detail in the resume is a potential source for a probing question."),
  answer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE. Crucially, you MUST format the model answer as a newline-separated list of 3-4 concise bullet points, where each point starts with a hyphen (e.g., '- First point.\\n- Second point.'). These bullet points for the recruiter must be very brief and crisp, ideally just a few key words or a very short phrase, serving as a quick checklist of essential elements the candidate should touch upon. Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it exceptionally easy for a non-technical recruiter to judge. While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid baseline for evaluation. Answers must be basic, clear, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content when crucial for context. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. This textual guidance is to help the panelist understand the relative importance of each point when they assign their overall 1-10 score for the question using the slider. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For the 'Tell me about yourself' question: the model answer MUST be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, and MUST NOT be a script for the candidate."),
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
You are a world-class AI-powered recruitment strategist. Your mission is to create a deeply personalized and strategically sound interview kit that empowers any interviewer to conduct a thorough and insightful evaluation. Your core directive is to move beyond face-value claims on a resume and generate questions that require the candidate to prove their expertise through concrete evidence and detailed examples.

**CONTEXT FOR ANALYSIS (YOU MUST SYNTHESIZE ALL OF THE FOLLOWING SOURCES):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your primary goal is to derive questions from the specific details within this resume.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**YOUR PROCESS**

**CRITICAL STEP 1: CANDIDATE-TO-ROLE ANALYSIS**
First, conduct a silent, internal analysis of the candidate's profile against the Job Description. If a resume is provided, it is your MOST IMPORTANT source of information. You must synthesize the Unstop link, the full resume content, and any additional context to identify the primary interview scenario. This classification will determine your question strategy.
*   **Solid, Directly Relevant Experience**: Candidate's experience is a strong match for the JD's core requirements.
*   **Overqualified**: Candidate's experience significantly exceeds the role's level (e.g., a senior applying for a mid-level role).
*   **Underqualified or Junior**: Candidate has clear gaps in required experience, is a recent graduate, or has experience that is strong but less than the years requested (e.g., 3 years of project leadership vs. 5+ years of PM experience requested).
*   **Domain-Shift**: Candidate is moving from a different industry (e.g., gaming to fintech), technology domain (e.g., OpenAI to Gemini), or role type (e.g., QA to DevOps).
*   **Career History Nuance**: Candidate's profile shows points needing clarification, such as significant employment gaps, frequent job changes, or ambiguous role titles.

**CRITICAL STEP 2: STRATEGIC QUESTION SELECTION**
Based on your analysis, you will now construct the interview kit. You MUST draw questions from the following strategic question bank. **Crucially, you must personalize these questions by replacing placeholders (e.g., "[Technology from Resume]", "[Project from Resume]") with specific, verifiable details taken directly from the candidate's resume and the job description. Do not invent or assume details.** Select a broad mix of the most relevant questions for the determined scenario, including several from "Universal Ice-breakers" and "Cross-cutting Behavioural", to create a comprehensive list of 15-20 questions. You MUST include a healthy mix of general questions (from "Universal Ice-breakers" and "Cross-cutting Behavioural") alongside the highly specific, personalized questions to ensure a balanced interview flow.

---
**STRATEGIC QUESTION BANK**

**1. Universal Ice-breakers**
(Purpose: Always useful—set the tone, surface key themes before going deep)
*   "Tell me a bit about yourself and what drew you to this role in particular."
*   "Walk me through your professional journey so far—what are the pivots or milestones you’re proudest of?"
*   "What in your last project excited you the most, and why?"

**2. Candidate has Solid, Directly Relevant Experience**
(Purpose: Confirm depth, scope, and impact. These questions must verify expertise, not just confirm it.)
*   "On your project, [Project from Resume], you mentioned using [Technology from Resume]. Describe a specific problem you solved with it that a beginner would not have been able to. What were the alternatives you considered and why was your solution the best one?"
*   "What measurable outcome (e.g., latency reduction, revenue increase) did your work on [Project from Resume] deliver to the business? How do you know your specific contribution led to that outcome?"
*   "Your resume lists expertise in [Another Technology from Resume]. How did you influence architecture or technical decisions related to it in your team? Can you cite a specific trade-off you championed?"

**3. Overqualified Candidates**
(Purpose: Understand motivation and assess flexibility)
*   "You clearly have senior/lead experience—what appeals to you about this mid-level individual-contributor role?"
*   "How do you ensure you stay hands-on and collaborative when working with less-experienced teammates?"

**4. Underqualified or Junior Candidates**
(Purpose: Gauge learning agility, fundamentals, and growth mindset)
*   "This role asks for [Experience from JD, e.g., '5+ years'], and your resume shows strong project leadership on [Project from Resume]. Can you detail the complexities you managed there to demonstrate your capabilities?"
*   "Could you explain how a [Fundamental Concept from JD, e.g., 'Java CompletableFuture'] differs from a [Related Concept]? Why might you choose one over the other?"
*   (For recent grads) "Your [Academic Project from Resume] seems very relevant. Could you describe its architecture and how you handled real-world development considerations like scalability or robustness?"

**5. Domain-Shift Scenarios**
(Purpose: Test adaptability and transferability of skills)
*   **Tech Stack Shift (e.g., OpenAI to Gemini):** "You have deep experience with [Technology from Resume, e.g., OpenAI API]. This role uses [Technology from JD, e.g., Gemini API]. How would your expertise accelerate your ramp-up, and what's your plan to master the new stack?"
*   **Industry Shift (e.g., e-commerce to fintech):** "What sparked your interest in moving from [Previous Domain, e.g., e-commerce] to [Our Domain, e.g., fintech], and how do you plan to get up to speed on industry-specific regulations?"
*   **Role Type Shift (e.g., QA to DevOps):** "What motivated your transition from [Previous Role Type] to [New Role Type], and how does your past experience give you a unique advantage in this new function?"

**6. Cross-cutting Behavioural / Culture-Fit Questions**
(insert these regardless of scenario when you need depth)
*   "Tell me about a time you received critical feedback. How did you react and what changed afterward?"
*   "Describe a situation where business priorities shifted suddenly. How did you realign your work?"

**7. Career History Clarification**
(Purpose: Respectfully probe for context on resume details)
*   (If Gap) "Your resume shows an employment gap between [Start Date] and [End Date]. Could you tell me more about what you were focused on during that time?"
*   (If Frequent Job Switching) "You've held a few different roles over the past few years. Could you share what you've learned from these transitions and what you're seeking in your next role to ensure a long-term fit and growth?"
*   (If Ambiguous Title) "Your role as '[Ambiguous Title]' sounds like it covered a lot of ground. Could you clarify how much of your time was dedicated to hands-on development versus other responsibilities?"
---

**CRITICAL STEP 3: OUTPUT GENERATION**
Now, generate the final output adhering strictly to the output schema. Your questions must be **crisp, concise, and professional**, sounding like they come from an experienced recruiter. When personalizing, **subtly weave details from the resume into practical, probing questions** rather than just stating facts from the document.

1.  **Start with "Tell me about yourself":** The very first competency should be something like "Introduction" and it MUST contain a personalized version of the "Tell me about yourself" question.
2.  **Drill into Projects:** Generate SEVERAL questions that specifically reference different projects, technologies, or accomplishments mentioned in the candidate's resume. Probe for details about challenges, architecture, and outcomes.
3.  **Assign Classifications**: For each question, you MUST assign a \`type\`, \`category\`, and \`difficulty\` from the available options. This ensures a well-rounded and structured interview kit.
4.  **Organize Logically:** Organize the selected questions into 5-7 logical competencies (e.g., "Introduction", "Project Deep Dive," "Technical Skills," "Team Collaboration"). Ensure every question and rubric criterion you create is deeply informed by your holistic analysis and the principles of the strategic question bank.
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
