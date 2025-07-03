
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
  question: z.string().describe("A crisp and concise interview question, ONE or TWO lines at most. The question MUST be deeply technical and domain-specific, designed to validate and probe the depth of skills and experiences claimed on the resume. It should connect the candidate's project experience directly to the requirements and challenges outlined in the Job Description. Instead of just asking if they know a technology, the question should ask them to demonstrate their expertise with specific examples of architectural decisions, complex technical challenges they solved, or how their work delivered specific business outcomes. The question must be insightful and highly specific, directly derived from projects, skills, or achievements mentioned in the Candidate's Unstop Profile and Resume. Every technical detail in the resume is a potential source for a probing question. Do NOT include the candidate's name in the question itself."),
  interviewerNote: z.string().describe("A brief, one-sentence note FOR THE INTERVIEWER. This note MUST explain the strategic purpose of the question, guiding the interviewer on what to look for. For example, 'This tests the candidate's ability to articulate the business impact of their technical work' or 'This probes the depth of their hands-on experience with [Technology from Resume]'. This note should NOT be visible to the candidate."),
  modelAnswer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE. In all explanations and notes within the model answer, refer to the person being interviewed as 'the candidate', not 'you'. Crucially, you MUST format the model answer as a newline-separated list of 3-4 concise bullet points, where each point starts with a hyphen (e.g., '- First point.\\n- Second point.'). These bullet points collectively serve as an 'info section' or a checklist of required points for the interviewer. They must contain the KEY TECHNICAL AND DOMAIN-SPECIFIC elements a strong candidate should cover, ensuring answers are technically rich and concepts are well-explained. Each point must not just name a concept but also provide its technical explanation within the bullet point itself. For example, if a question asks for OOP principles, a bullet point MUST be like: '- Encapsulation: Explains the bundling of data and methods into a single unit.' To further aid non-technical interviewers, each bullet point must include a very brief, non-technical 'Brief Answer Snippet' in parentheses that clarifies the core concept clearly enough for an interviewer to follow the logic, not just look for keywords. EXPLICITLY reference key terms, technologies, project names, or required skills from the Job Description AND/OR the Candidate's Resume when crucial for context. A CRITICAL REQUIREMENT: each bullet point MUST also end with a textual suggestion of its indicative weight or contribution (e.g., '(approx. 2-3 points)', '(around 4 points)') towards the question's total 10-point score. This guidance is MANDATORY and helps panelists, especially non-technical ones, understand the relative importance of each point when assigning a score. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score. Include guidance on evaluating real-life examples using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth. The interviewer should assess the relevance and substance of such information against the job requirements.' For the 'Tell me about yourself' question: the model answer MUST be a guide for the INTERVIEWER, outlining key points from the candidate's specific background (qualifications, education, projects, work history) that constitute a strong introduction, helping a non-technical recruiter assess relevance."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills. Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level."),
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
  name: z.string().describe("The name of a well-defined, distinct, and high-quality scoring criterion. It must be actionable, measurable, and directly relevant to the role. Each criterion MUST be extremely specific, explicitly mentioning key technologies, skills, project types, or domain-specific concepts found in the Job Description AND supported by evidence in the Candidate's Resume/Context. The set of criteria MUST provide a deep, contextual basis for evaluating technical and domain expertise, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
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
You are a world-class AI-powered recruitment strategist. Your mission is to create a deeply personalized and strategically sound interview kit that empowers any interviewer to conduct a thorough and insightful evaluation. Your core directive is to move beyond face-value claims on a resume and generate questions that require the candidate to prove their expertise through concrete evidence and detailed examples. A CRITICAL RULE: Interview questions must sound natural and conversational. They should NEVER explicitly mention "the job description" or "the role requires." Instead, use the job description as your internal context to understand what skills are important, and then formulate questions based on the candidate's resume.

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
*   **Domain-Shift**: Candidate is moving from a different industry (e.g., gaming to fintech), technology domain (e.g., OpenAI to Gemini), role type (e.g., QA to DevOps, or a technical expert to a Sales Manager), or academic background (e.g., physics PhD for a data science role).
*   **Career History Nuance**: Candidate's profile shows points needing clarification, such as significant employment gaps, frequent job changes, or ambiguous role titles.

**CRITICAL STEP 2: STRATEGIC QUESTION SELECTION**
Based on your analysis, you will now construct the interview kit. You MUST draw questions from the following strategic question bank. **Crucially, you must personalize these questions by replacing placeholders (e.g., "[Technology from Resume]", "[Project from Resume]") with specific, verifiable details taken directly from the candidate's resume. Use the job description for context on what to probe for, but DO NOT mention it in the questions.** Select a broad mix of the most relevant questions for the determined scenario. Your goal is to create a comprehensive and strategic interview kit with a total of **exactly 20 questions**. Distribute these questions logically across the competencies to ensure a thorough evaluation. Ensure that the majority of the questions are technical in nature, drawing heavily from the 'DEEPLY TECHNICAL PROBES' category. **Crucially, you must select at least five questions from the 'Domain & Industry Knowledge' category** to probe the candidate's strategic thinking and business acumen. Each question must be critical, logical, and deeply domain-specific, designed to challenge the candidate's core problem-solving abilities and force them to articulate the reasoning behind their decisions.

---
**STRATEGIC QUESTION BANK**

**1. Universal Ice-breakers**
(Purpose: Always useful—set the tone, surface key themes before going deep)
*   "Tell me a bit about yourself and what drew you to this role in particular."
*   "Walk me through your professional journey so far—what are the pivots or milestones you’re proudest of?"
*   "What in your last project excited you the most, and why?"

**2. Candidate has Solid, Directly Relevant Experience (DEEPLY TECHNICAL PROBES)**
(Purpose: Confirm depth, scope, and impact. These questions MUST be highly technical and verify expertise, not just confirm it.)
*   "On your project, [Project from Resume], you mentioned using [Technology from Resume]. Describe a specific problem you solved with it that a beginner would not have been able to. What were the alternatives you considered and why was your solution the best one?"
*   "What measurable outcome (e.g., latency reduction, revenue increase) did your work on [Project from Resume] deliver to the business? How do you know your specific contribution led to that outcome?"
*   "Your resume lists expertise in [Another Technology from Resume]. How did you influence architecture or technical decisions related to it in your team? Can you cite a specific trade-off you championed?"
*   "Walk me through the design and implementation of the [Feature from Project on Resume] you built. What were the key data structures, design patterns, or algorithms involved, and why did you choose them?"
*   "Your resume mentions experience with [Specific Database/System, e.g., 'PostgreSQL optimization' or 'Kafka stream processing']. Can you explain how you would debug a performance issue in that system? What specific tools or commands would you use?"
*   "Considering [Project from Resume], if you had to re-architect it today for a 10x increase in user traffic, what would be your primary concerns and what specific changes would you propose to the [Infrastructure/Backend/Database]?"
*   "You listed [API Technology, e.g., 'GraphQL'] on your resume. Describe how you've handled API versioning, security (e.g., authentication, authorization), and documentation in a past project."

**3. Overqualified Candidates**
(Purpose: Understand motivation and assess flexibility)
*   "You clearly have senior/lead experience—what appeals to you about this mid-level individual-contributor role?"
*   "How do you ensure you stay hands-on and collaborative when working with less-experienced teammates?"

**4. Underqualified or Junior Candidates**
(Purpose: Gauge fundamentals and potential)
*   "Could you explain how a [Fundamental Concept from JD, e.g., 'Java CompletableFuture'] differs from a [Related Concept]? Why might you choose one over the other?"
*   (For recent grads) "Your [Academic Project from Resume] seems very relevant. Could you describe its architecture and how you handled real-world development considerations like scalability or robustness?"

**5. Probing for Learning Agility & Growth Mindset**
(Purpose: Assess adaptability, resilience, and curiosity. CRITICAL for all candidates.)
*   "Describe a time you had to learn a new technology or skill very quickly to meet a project deadline. What was your process?"
*   "Tell me about a significant piece of critical feedback you've received. How did it change your approach to your work?"
*   "Walk me through a situation where a project's requirements were ambiguous or changed suddenly. How did you adapt, and what was the outcome?"
*   "Outside of your formal work, how do you stay up-to-date with new trends and technologies in [Relevant Field from JD, e.g., 'cloud infrastructure' or 'generative AI']?"
*   "Describe a project or task that failed. What was your role in the failure, and what did you learn from it?"

**6. Domain-Shift Scenarios**
(Purpose: Test adaptability and transferability of skills)
*   **Tech Stack Shift (e.g., OpenAI to Gemini):** "I see you have deep experience with [Technology from Resume, e.g., OpenAI API]. How do you see that experience translating to working with [Technology from JD, e.g., Gemini API]?"
*   **Industry Shift (e.g., e-commerce to fintech):** "I noticed you're moving from [Previous Domain, e.g., e-commerce] to [Our Domain, e.g., fintech]. What sparked your interest in this shift, and how do you plan to get up to speed on industry-specific regulations?"
*   **Role Type Shift (e.g., QA to DevOps, or a technical expert to a Sales Manager):** "What motivated your transition from [Previous Role Type] to [New Role Type], and how does your past experience give you a unique advantage in this new function?"

**7. Domain & Industry Knowledge**
(Purpose: Gauge understanding of the industry landscape and specific challenges)
*   "What are some of the biggest technical challenges or trends you see in the [Industry from JD, e.g., 'fintech' or 'healthcare tech'] space right now?"
*   "From your perspective, what differentiates our company from other players in the [Industry from JD] space?"
*   "How do you think about balancing innovation with regulatory compliance in an industry like [Industry from JD]?"
*   (If applicable) "Can you discuss your understanding of [Specific Standard or Regulation from JD, e.g., 'HIPAA' or 'PCI-DSS'] and its implications for software development?"

**8. Cross-cutting Behavioural / Culture-Fit Questions**
(insert these regardless of scenario when you need depth)
*   "Describe a time when you had a disagreement with a teammate. How did you resolve it?"
*   "Describe a situation where business priorities shifted suddenly, forcing you to rethink your approach. How did you realign your work?"

**9. Career History Clarification**
(Purpose: Respectfully probe for context on resume details)
*   (If Gap) "I noticed on your resume there's an employment gap between [Start Date] and [End Date]. Could you tell me more about what you were focused on during that time?"
*   (If Frequent Job Switching) "You've held a few different roles over the past few years. Could you share what you've learned from these transitions and what you're seeking in your next role to ensure a long-term fit and growth?"
*   (If Ambiguous Title) "Your role as '[Ambiguous Title]' sounds like it covered a lot of ground. Could you clarify how much of your time was dedicated to hands-on development versus other responsibilities?"
---

**CRITICAL STEP 3: OUTPUT GENERATION**
Now, generate the final output adhering strictly to the output schema. Your questions must be **crisp, concise, and professional**, sounding like they come from an experienced recruiter. When personalizing, **subtly weave details from the resume into practical, probing questions** rather than just stating facts from the document.

1.  **Assign Classifications**: For each question, you MUST assign its type, category, and difficulty from the available options. This ensures a well-rounded and structured interview kit.
2.  **Organize Logically:** You MUST structure the interview by organizing the selected questions into 5-7 logical competencies. The flow should be natural and progressive, starting broad and then diving deep into technical specifics. A significant portion of the competencies MUST be technical. Follow this structure:
    *   **Introduction & Motivation:** The first competency. It MUST start with a personalized "Tell me about yourself" question, followed by questions about their interest in the role and company.
    *   **Technical Project Deep Dives:** Dedicate at least one or two competencies to the most significant projects from the candidate's resume. These competencies should contain your most rigorous technical questions, probing deep into architecture, design choices, specific challenges, and measurable outcomes.
    *   **Core Technical Skills:** Have another competency dedicated to testing fundamental technical skills, algorithms, data structures, and tools required by the Job Description but perhaps not explicitly covered in a project.
    *   **Behavioral & Growth Mindset:** Group questions from the "Learning Agility" and "Cross-cutting Behavioural" sections to assess teamwork, problem-solving, and adaptability.
    *   Ensure every question and rubric criterion you create is deeply informed by your holistic analysis and the principles of the strategic question bank.
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
          modelAnswer: q.modelAnswer || "Missing model answer. (Guidance: For the interviewer, list 3-4 brief, crisp bullet points of key elements a strong candidate should cover, with indicative marks for each, e.g., 'approx. 2-3 points'. Note how to evaluate off-resume info.)",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        id: randomUUID(),
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
