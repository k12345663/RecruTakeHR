export type QuestionDifficulty =
  | 'Naive'
  | 'Beginner'
  | 'Intermediate'
  | 'Expert'
  | 'Master';

export type QuestionType = 'Technical' | 'Scenario' | 'Behavioral';

export type QuestionCategory = 'Technical' | 'Non-Technical';

export interface Question {
  id: string;
  question: string;
  modelAnswer: string;
  type: QuestionType;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  estimatedTimeMinutes: number;
}

export interface Competency {
  id: string;
  name: string;
  importance: Importance;
  questions: Question[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
}

export type Importance = 'High' | 'Medium' | 'Low';
