
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
  modelAnswer: z.string().describe("A \"Model Answer Guide\" for the interviewer, composed of MULTIPLE points (at least 3-4) to form a comprehensive checklist. Format this as a single string where each checklist point is separated by a triple newline ('\\n\\n\\n'). Each point MUST follow this format EXACTLY: A title for the evaluation point, followed by two newlines, then 'Sample:', followed by a newline, and then a very detailed, multi-sentence explanation. This explanation must be a high-quality, legitimate answer to the point, written to educate a non-technical interviewer. It MUST NOT be an instruction about what the candidate should say (e.g., AVOID 'The candidate should explain...')."),
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
You are a world-class AI-powered recruitment strategist, acting as an expert technical interviewer at a major tech company. Your mission is to create a deeply technical and practical interview kit to evaluate a candidate for a data science/machine learning position.

**CONTEXT FOR ANALYSIS (YOU MUST SYNTHESIZE ALL OF THE FOLLOWING SOURCES):**
*   **Job Description**: {{{jobDescription}}}
*   **Unstop Profile Link**: {{{unstopProfileLink}}}
{{#if candidateResumeDataUri}}*   **Candidate Resume ({{candidateResumeFileName}})**: {{media url=candidateResumeDataUri}} (CRITICAL: You MUST analyze the full content of this document with extreme depth. Your primary goal is to assess the candidate's fitness for the role described in the Job Description, using the specific details from the resume to **tailor and personalize** the JD-centric questions.){{/if}}
{{#if candidateExperienceContext}}*   **Additional Candidate Context**: {{{candidateExperienceContext}}}{{/if}}

**YOUR TASK: GENERATE THE INTERVIEW KIT**

Based on your deep analysis of both the Job Description and the candidate's Resume, and on current industry standards for this role, generate a comprehensive set of **15-20 highly technical, realistic interview questions**.

**QUESTION GENERATION PRINCIPLES:**

1.  **Technical Depth**: Questions must be specific and probe for deep understanding, not surface-level knowledge.
2.  **Mix of Question Types**: The questions must cover a mix of:
    *   **Deep Conceptual Understanding**: e.g., "Explain how X works, why it’s important in practice, common pitfalls, how you’d apply it in production."
    *   **Technical Stack & Tools**: e.g., "How would you use library/tool Y for scenario Z?" (Draw tools from the JD and resume).
    *   **Real Project Scenarios**: e.g., "Describe a time you solved…", "How would you build…", "Suppose you encounter… what’s your debugging approach?"
    *   **Tradeoffs & Reasoning**: e.g., "Which algorithm would you pick for… why not the alternatives?", "How do you balance performance vs interpretability?"
3.  **Contextualization**:
    *   Most questions should be derived from the core requirements of the **Job Description**.
    *   A few (2-3) questions should be **directly tailored** to the candidate's resume, referencing specific projects or skills to verify their experience.
    *   The style must be at a technical level, not an HR level.

**MODEL ANSWER GENERATION (CRITICAL INSTRUCTION):**

For each question, you MUST provide a detailed \`modelAnswer\`. This is the most important part of your task.
*   **Format**: The \`modelAnswer\` MUST be a single string containing multiple evaluation points. Each point MUST be separated from the next by a triple newline ('\\n\\n\\n'). Each point MUST follow this format EXACTLY:
    \`A title for the evaluation point.\\n\\nSample:\\nA detailed explanation written as an expert would deliver it. This should be a comprehensive, multi-paragraph if needed, referencing real tools, workflows, and best practices with deep technical reasoning. It should be a human, real-world style answer, not generic or superficial.\`
*   **Content**:
    *   The \`Sample:\` text must be the **actual, detailed answer**, not a description of what the candidate should say.
    *   **CRITICAL: DO NOT use phrases that describe what the candidate should do (e.g., AVOID 'The candidate explains...', 'Describes how they...', 'Demonstrates understanding of...', or 'Provides examples of...'). Similarly, AVOID first-person narrative (e.g., AVOID 'I did this...', 'In my last project...'). Instead, write the actual, detailed answer itself as a generalized, expert-level explanation.**
    *   Where a question has multiple sub-parts, address each one in a dedicated evaluation point section.
*   **PERFECT EXAMPLE**:
    Question: Given a highly imbalanced healthcare dataset (1:100 positive:negative), which classification algorithm would you choose and how would you optimize for recall and precision?
    \`modelAnswer\`: "Justifies algorithm choice.\\n\\nSample:\\nFor this level of imbalance, XGBoost or LightGBM are strong choices because both natively support custom class weights and have strong track records on tabular medical data. Logistic regression can fail to capture complex, non-linear patterns in EHR, while tree ensembles—especially XGBoost—are robust, support parallel training, and allow for direct adjustment of parameters like scale_pos_weight to counteract class imbalance.\\n\\n\\nDescribes tuning for recall/precision.\\n\\nSample:\\nA key strategy is to focus on maximizing recall, as missing positives in healthcare is often critical. This process involves using the 'scale_pos_weight' parameter in XGBoost, often starting at the inverse of the class ratio—so, 100 in this case. Stratified k-fold cross-validation is also implemented to ensure each fold preserves the class imbalance during training and validation. For evaluation, both ROC and Precision-Recall curves are plotted. The main focus would be tuning the decision threshold on the predicted probabilities to push recall to an acceptable level, while monitoring how much precision drops. Another technique is to use GridSearchCV with a custom scoring metric like the F2-score, which weighs recall more heavily than precision, to find the best hyperparameters.\\n\\n\\nExplains validation and metrics.\\n\\nSample:\\nInstead of relying on accuracy, which is misleading here, best practice is to report sensitivity (recall), specificity, and AUC-PR on a holdout test set. A detailed confusion matrix is also essential. To simulate real-world deployment, the final model should be validated on a month of unseen data, with analysis of any false positives and negatives alongside domain experts to ensure the model’s error patterns are acceptable. All chosen thresholds should be documented, and borderline cases flagged for manual review."

**FINAL OUTPUT:**
Organize the questions into 5-7 logical competencies. The vast majority of competencies MUST be technical. Also generate a scoring rubric based on the core skills required by the JD.
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
