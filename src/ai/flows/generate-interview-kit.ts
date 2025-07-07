
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
  interviewerNote: z.string().describe("A brief, one-sentence note FOR THE INTERVIEWER. This note MUST explain the strategic purpose of the question, guiding the interviewer on what to look for. For example, 'This tests the candidate's ability to articulate the business impact of their technical work' or 'This probes the depth of their hands-on experience with [Technology from Resume]'. This note should NOT be visible to the candidate."),
  modelAnswer: z.string().describe("A \"Model Answer Guide\" for the interviewer, composed of MULTIPLE points (at least 3-4) to form a comprehensive checklist. Format this as a single string where each checklist point is separated by a double newline ('\\n\\n'). Each point MUST follow this format EXACTLY: A title for the evaluation point (e.g., 'Explains it is Object Oriented'), followed by a newline, then the literal string 'Sample:- ', followed by a very detailed, multi-sentence explanation. This explanation must be a high-quality, legitimate answer to the point, written to educate a non-technical interviewer."),
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
You are a world-class AI-powered recruitment strategist, acting as an expert technical interviewer. Your mission is to create a deeply technical and practical interview kit. Your core directive is to **AVOID generic or philosophical questions** (e.g., "Why did you use this technology?" or "What’s the difference between X and Y?"). Instead, you must generate **direct, technical questions** that test a candidate's ability to solve real problems and demonstrate hands-on expertise.

**CONTEXT FOR ANALYSIS (YOU MUST SYNTHESIZE ALL OF THE FOLLOWING SOURCES):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your primary goal is to derive questions from the specific details within this resume.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**YOUR PROCESS**

**CRITICAL STEP 1: CANDIDATE-TO-ROLE ANALYSIS**
First, conduct a silent, internal analysis of the candidate's profile against the Job Description. If a resume is provided, it is your MOST IMPORTANT source of information. Synthesize all context to determine the candidate's profile. This classification will determine your question strategy.
*   **Solid, Directly Relevant Experience**: Strong match for the JD's core requirements.
*   **Overqualified**: Experience significantly exceeds the role's level.
*   **Underqualified or Junior**: Gaps in required experience, recent graduate.
*   **Domain-Shift**: Moving from a different industry, technology domain, or role type.
*   **Career History Nuance**: Profile shows points needing clarification (gaps, frequent changes).

**CRITICAL STEP 2: STRATEGIC TECHNICAL QUESTION GENERATION**
Based on your analysis, construct the interview kit. Your goal is to create a comprehensive kit with **exactly 20 questions**. You MUST select and personalize questions from the following **Technical Question Bank**. Replace placeholders like "[Technology from Resume]" with specific, verifiable details from the candidate's resume and profile.

Every question you generate MUST be a direct, technical probe designed to test one or more of these core competency areas:
1.  **Conceptual Understanding**: Can the candidate explain the core concepts behind a technology?
2.  **Practical Application**: Can they write code, design a system, or troubleshoot real issues?
3.  **Problem Solving**: Can they break down and solve technical challenges?
4.  **Optimization**: Do they know how to make something faster, more efficient, or more reliable?
5.  **Best Practices**: Are they aware of standards, design patterns, or common pitfalls?
6.  **Debugging and Testing**: Can they identify and fix bugs and ensure quality?
7.  **Scalability/Security**: Do they consider performance, scalability, or security in their solutions?

---
**TECHNICAL QUESTION BANK (Your primary source for questions)**

**1. Conceptual Understanding Probes**
*   "Your resume lists [Technology from Resume]. Can you explain how its [Core Concept, e.g., 'virtual DOM' for React, 'garbage collection' for Java] works under the hood?"
*   "Could you explain how a [Fundamental Concept from JD, e.g., 'Java CompletableFuture'] differs from a [Related Concept]? Why might you choose one over the other in a practical scenario?"
*   (For recent grads) "Your [Academic Project from Resume] is interesting. Can you describe its architecture and how you handled a key technical concept like [Concept, e.g., 'concurrency' or 'data normalization']?"

**2. Practical Application & Problem-Solving Probes**
*   "Walk me through the design and implementation of the [Feature from Project on Resume] you built. What were the key data structures, design patterns, or algorithms involved, and why did you choose them?"
*   "Describe the most complex system you've designed. What were the main components, and how did they interact? Draw a simple block diagram if it helps."
*   "You used [Technology from Resume] on [Project from Resume]. Write a small code snippet to accomplish [Specific Task, e.g., 'asynchronously fetch data from two endpoints and combine the results']."
*   "What measurable outcome (e.g., latency reduction, revenue increase) did your work on [Project from Resume] deliver to the business? How do you know your specific contribution led to that outcome?"

**3. Optimization, Scalability & Security Probes**
*   "Considering [Project from Resume], if you had to re-architect it today for a 10x increase in user traffic, what would be your primary concerns and what specific changes would you propose to the [Infrastructure/Backend/Database]?"
*   "Your resume mentions experience with [Specific Database/System, e.g., 'PostgreSQL optimization' or 'Kafka stream processing']. Can you explain how you would diagnose and resolve a performance bottleneck in that system?"
*   "You listed [API Technology, e.g., 'GraphQL' or 'REST'] on your resume. Describe how you've handled API security, such as authentication, authorization, and rate-limiting, in a past project."

**4. Best Practices, Debugging & Testing Probes**
*   "How did you approach testing for your [Project from Resume]? What was your strategy for unit, integration, and end-to-end tests?"
*   "Describe a time you had to debug a particularly challenging bug. What was your process for identifying the root cause, and what tools did you use?"
*   "Talk about a time you conducted a code review that led to a significant improvement in the codebase. What was the issue, and how did you communicate the feedback?"

**5. Behavioral Questions (Use Sparingly)**
*   (If Career History Nuance) "I noticed on your resume there's an employment gap between [Start Date] and [End Date]. Could you tell me more about what you were focused on during that time?"
*   "Describe a time when business priorities shifted suddenly, forcing you to rethink your technical approach. How did you adapt?"
---

**CRITICAL STEP 3: OUTPUT GENERATION**
Generate the final output adhering strictly to the schema.
1.  **Structure the Interview**: Organize the 20 questions into 5-7 logical competencies. The flow should be natural, starting broad and then diving deep. The majority of competencies MUST be technical.
    *   **Introduction & Motivation:** Start with ONE brief ice-breaker (e.g., "Walk me through your proudest project").
    *   **Technical Deep Dives**: Dedicate competencies to projects from the resume, using your most rigorous technical questions.
    *   **Core Technical Skills**: Have competencies testing fundamental skills from the JD.
    *   **Problem Solving & System Design**: Group questions that test design and architectural thinking.
2.  **Generate Rich Model Answers**: For each question, the \`modelAnswer\` MUST contain a comprehensive checklist of 3-4 evaluation points. Each point MUST follow this exact format: a title for the evaluation point (e.g., "Explains it is Object Oriented"), followed by a newline, then the literal text "Sample:- ", and then a very detailed, multi-sentence explanation that serves as a high-quality answer. This explanation must educate a non-technical interviewer on the topic. For example, a point could be structured exactly like this: "Explains it is Object Oriented\\nSample:- Java is an object-oriented programming language, which means it is based on the concepts of 'objects' and 'classes.' It follows the four fundamental principles of object-oriented programming (OOP): encapsulation, inheritance, polymorphism, and abstraction. These principles make Java code modular, easier to understand, maintain, and reuse.". The points must be separated by a double newline ('\\n\\n').
3.  **Assign Classifications**: For each question, assign its type, category, and difficulty.
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
