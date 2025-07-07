
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileUp, Briefcase, Info, RotateCcw } from 'lucide-react';
import { generateInterviewKit, GenerateInterviewKitOutput } from '@/ai/flows/generate-interview-kit';
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from '@/components/theme-toggle';
import { Slider } from '@/components/ui/slider';
import { Textarea as NotesTextarea } from '@/components/ui/textarea'; // Renamed to avoid conflict
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [unstopProfileLink, setUnstopProfileLink] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewKit, setInterviewKit] = useState<GenerateInterviewKitOutput | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setResumeFile(event.target.files[0]);
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription) {
        toast({
            title: "Job Description Required",
            description: "Please provide a job description to generate an interview kit.",
            variant: "destructive",
        })
        return;
    }
    if (!unstopProfileLink) {
        toast({
            title: "Unstop Profile Link Required",
            description: "Please provide the candidate's Unstop profile link.",
            variant: "destructive",
        })
        return;
    }
    setIsLoading(true);
    setInterviewKit(null);
    setScores({});
    setNotes({});

    try {
        let resumeDataUri: string | undefined;
        let resumeFileName: string | undefined;

        if (resumeFile) {
            resumeDataUri = await fileToDataUri(resumeFile);
            resumeFileName = resumeFile.name;
        }

        const kit = await generateInterviewKit({ 
            jobDescription, 
            unstopProfileLink,
            candidateResumeDataUri: resumeDataUri,
            candidateResumeFileName: resumeFileName,
        });
        setInterviewKit(kit);
    } catch (error) {
        console.error(error);
        toast({
            title: "Error Generating Kit",
            description: "There was an issue generating the interview kit. Please try again.",
            variant: "destructive",
        })
    } finally {
        setIsLoading(false);
    }
  };

  const handleScoreChange = (questionId: string, value: number[]) => {
    const newScore = value[0];
    setScores(prevScores => ({
        ...prevScores,
        [questionId]: newScore,
    }));
  };

  const handleNotesChange = (questionId: string, value: string) => {
    setNotes(prevNotes => ({
        ...prevNotes,
        [questionId]: value,
    }));
  };

  const calculateAverageScore = () => {
    if (!interviewKit) return 0;
    const allQuestions = interviewKit.competencies.flatMap(c => c.questions);
    if (Object.keys(scores).length === 0) return 0;
    
    const scoredQuestionsCount = allQuestions.filter(q => scores[q.id!] !== undefined).length;
    if (scoredQuestionsCount === 0) return 0;

    const totalScore = allQuestions.reduce((acc, q) => acc + (scores[q.id!] || 0), 0);
    const average = totalScore / scoredQuestionsCount;
    return average;
  };

  const handleRestart = () => {
    setJobDescription('');
    setUnstopProfileLink('');
    setResumeFile(null);
    setInterviewKit(null);
    setScores({});
    setNotes({});
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">RecruTake</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Generate Interview Kit</CardTitle>
                <CardDescription>
                  Provide the details below to create a tailored interview kit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-description">Job Description</Label>
                    <Textarea
                      id="job-description"
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      required
                      className="min-h-[200px]"
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="unstop-profile">Unstop Profile Link</Label>
                    <Input
                      id="unstop-profile"
                      placeholder="https://unstop.com/p/username"
                      value={unstopProfileLink}
                      onChange={(e) => setUnstopProfileLink(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resume">Candidate Resume (Optional)</Label>
                     <div className="relative">
                        <Input
                            id="resume-display"
                            placeholder={resumeFile ? resumeFile.name : "Upload a PDF or DOCX file"}
                            readOnly
                            className="pr-10 cursor-pointer"
                            onClick={() => document.getElementById('resume')?.click()}
                        />
                        <label htmlFor="resume" className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
                            <FileUp className="w-5 h-5 text-muted-foreground" />
                        </label>
                        <Input
                            id="resume"
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={resumeInputRef}
                        />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Kit'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-lg text-muted-foreground">Generating your interview kit...</p>
                    <p className="text-sm text-muted-foreground">This may take a moment.</p>
                </div>
              </div>
            )}
            {!isLoading && !interviewKit && (
                <div className="flex flex-col items-center justify-center h-full rounded-lg border border-dashed p-8 text-center bg-card">
                    <Briefcase className="h-16 w-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-xl font-semibold">Your Interview Kit Will Appear Here</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Fill out the form on the left to generate questions, a scoring rubric, and more.
                    </p>
                </div>
            )}
            {interviewKit && (
              <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                        <h2 className="text-2xl font-bold">Interview Competencies</h2>
                        <Button variant="outline" onClick={handleRestart}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Generate New Kit
                        </Button>
                    </div>
                  <div className="space-y-4">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {interviewKit.competencies.map((comp, index) => (
                        <Card key={comp.id || index} className="overflow-hidden">
                            <AccordionItem value={`item-${index}`} className="border-b-0">
                                <AccordionTrigger className="p-4 md:p-6 bg-muted/50 hover:no-underline">
                                    <div className='flex justify-between w-full items-center'>
                                        <CardTitle className="text-xl">{comp.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm bg-background text-muted-foreground px-2 py-1 rounded-md border">Importance: {comp.importance}</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 md:p-6">
                                <div className="space-y-4">
                                    {comp.questions.map((q) => {
                                    return (
                                        <div key={q.id} className="p-4 rounded-lg bg-background border space-y-4">
                                        <p className="font-semibold">{q.question}</p>
                                        
                                        {q.interviewerNote && (
                                                <div className="flex items-start gap-2 text-xs italic text-muted-foreground bg-muted/50 p-2 rounded-md">
                                                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                                    <p><span className="font-semibold text-foreground/90">Interviewer Note:</span> {q.interviewerNote}</p>
                                                </div>
                                            )}

                                        <div className="text-xs text-muted-foreground flex items-center gap-x-2 flex-wrap">
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{q.type}</span>
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{q.category}</span>
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{q.difficulty}</span>
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{q.estimatedTimeMinutes} mins</span>
                                        </div>
                                        
                                        <div>
                                        <p className="font-medium mb-2 text-base">Model Answer Guide:</p>
                                            <div className="space-y-4">
                                                {q.modelAnswer.split('\n\n\n').filter(point => point.trim() !== '').map((point, i) => {
                                                    const firstNewlineIndex = point.indexOf('\n');
                                                    const title = firstNewlineIndex !== -1 ? point.substring(0, firstNewlineIndex) : point;
                                                    const explanation = firstNewlineIndex !== -1 ? point.substring(firstNewlineIndex + 1).trim() : '';

                                                    return (
                                                        <div key={`${q.id}-point-${i}`} className="flex items-start gap-3">
                                                            <Checkbox id={`${q.id}-point-${i}`} className="mt-1 flex-shrink-0" />
                                                            <div className="grid gap-1 flex-1">
                                                                <Label htmlFor={`${q.id}-point-${i}`} className="font-medium text-foreground leading-snug cursor-pointer">
                                                                    {title}
                                                                </Label>
                                                                {explanation && (
                                                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                                        {explanation}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                            <div className="pt-4 border-t space-y-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <Label htmlFor={`score-slider-${q.id}`} className="text-base font-medium">Score Answer</Label>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="font-bold text-2xl text-primary">{scores[q.id!] || 0}</span>
                                                            <span className="text-sm text-muted-foreground">/ 10</span>
                                                        </div>
                                                    </div>
                                                    <Slider
                                                        id={`score-slider-${q.id}`}
                                                        value={[scores[q.id!] || 0]}
                                                        max={10}
                                                        step={1}
                                                        onValueChange={(value) => handleScoreChange(q.id!, value)}
                                                    />
                                                </div>
                                                <div>
                                                <Label htmlFor={`notes-${q.id}`} className="text-base font-medium">Panelist Notes</Label>
                                                <NotesTextarea 
                                                    id={`notes-${q.id}`}
                                                    placeholder="Enter your notes here..."
                                                    value={notes[q.id!] || ''}
                                                    onChange={(e) => handleNotesChange(q.id!, e.target.value)}
                                                    className="mt-2"
                                                />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                    })}
                                </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                        ))}
                    </Accordion>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Scoring Rubric</h2>
                  <Card>
                    <CardContent className="p-6">
                      <ul className="space-y-4">
                        {interviewKit.scoringRubric.map((criterion) => (
                          <li key={criterion.id!} className="flex justify-between items-start gap-4 p-3 rounded-lg bg-background border">
                            <span className="flex-1 text-sm">{criterion.name}</span>
                            <span className="ml-4 font-bold text-primary whitespace-nowrap">{(criterion.weight * 100).toFixed(0)}%</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Overall Score</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle>Average Candidate Score</CardTitle>
                            <CardDescription>
                                This is the average score calculated across all questions that have been scored.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 text-center">
                            <span className="text-6xl font-bold text-primary">{calculateAverageScore().toFixed(1)}</span>
                            <span className="text-2xl text-muted-foreground"> / 10</span>
                        </CardContent>
                    </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        RecruTake by Unstop
      </footer>
    </div>
  );
}
