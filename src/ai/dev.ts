import { config } from 'dotenv';
config();

import '@/ai/flows/identify-potential-projects.ts';
import '@/ai/flows/review-resume-skills.ts';
import '@/ai/flows/summarize-jd.ts';
import '@/ai/flows/generate-initial-questions.ts';