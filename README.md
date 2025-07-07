# RecruTake: AI-Powered Interview Kit Generator

RecruTake is an intelligent, AI-powered application designed to streamline the technical interview process. It empowers recruiters and hiring managers to generate comprehensive, tailored interview kits based on a job description and a candidate's profile.

## Features

- **AI-Powered Kit Generation**: Leverages Google's Gemini models via Genkit to create high-quality interview content.
- **Deep Contextualization**: Analyzes job descriptions, Unstop profiles, and candidate resumes to generate highly relevant questions.
- **Comprehensive Competencies**: Automatically identifies and structures the interview around key technical and non-technical competencies required for the role.
- **Tailored Questions**: Generates a mix of technical, behavioral, and scenario-based questions calibrated to the candidate's experience level.
- **Detailed Model Answers**: Provides expert-level model answers for each question to guide interviewers in their evaluation.
- **Dynamic Scoring Rubric**: Creates a weighted scoring rubric based on the core requirements of the job.
- **Interactive Interview Panel**: Allows interviewers to score candidate answers, take notes, and see an aggregate score in real-time.
- **Modern, Responsive UI**: Built with Next.js and ShadCN UI for a clean and intuitive user experience.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **AI/Generative**: [Firebase Genkit](https://firebase.google.com/docs/genkit) with [Google's Gemini Models](https://deepmind.google/technologies/gemini/)
- **UI**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Component Library**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Hosting**: Firebase App Hosting

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Running the Development Server

1.  Install the dependencies:
    ```bash
    npm install
    ```

2.  Start the Next.js development server:
    ```bash
    npm run dev
    ```

3.  In a separate terminal, start the Genkit development server:
    ```bash
    npm run genkit:dev
    ```

4.  Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
