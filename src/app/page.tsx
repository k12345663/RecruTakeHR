
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileUp, Briefcase } from 'lucide-react';
import { generateInterviewKit, GenerateInterviewKitOutput } from '@/ai/flows/generate-interview-kit';
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [unstopProfileLink, setUnstopProfileLink] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewKit, setInterviewKit] = useState<GenerateInterviewKitOutput | null>(null);
  const { toast } = useToast();

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
                  <h2 className="text-2xl font-bold mb-4">Interview Competencies</h2>
                  <div className="space-y-4">
                    {interviewKit.competencies.map((comp, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="bg-muted/50">
                            <div className='flex justify-between w-full items-center'>
                                <CardTitle className="text-xl">{comp.name}</CardTitle>
                                <span className="text-sm bg-background text-muted-foreground px-2 py-1 rounded-md border">Importance: {comp.importance}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6">
                           <div className="space-y-4">
                             {comp.questions.map((q, qIndex) => {
                               const answerLines = q.answer.split('\n').filter(line => line.trim());
                               const noteLineIndex = answerLines.findIndex(line => line.trim().startsWith("Note:"));
                               const bulletPoints = noteLineIndex > -1 ? answerLines.slice(0, noteLineIndex) : answerLines;
                               const note = noteLineIndex > -1 ? answerLines.slice(noteLineIndex).join('\n') : null;

                               return (
                                 <div key={qIndex} className="p-4 rounded-lg bg-background border">
                                   <p className="font-semibold">{q.question}</p>
                                   <div className="text-xs text-muted-foreground mt-2 flex items-center gap-x-2 flex-wrap">
                                      <span className="bg-secondary px-2 py-0.5 rounded-full">{q.type}</span>
                                      <span className="bg-secondary px-2 py-0.5 rounded-full">{q.category}</span>
                                      <span className="bg-secondary px-2 py-0.5 rounded-full">{q.difficulty}</span>
                                      <span className="bg-secondary px-2 py-0.5 rounded-full">{q.estimatedTimeMinutes} mins</span>
                                   </div>
                                   <div className="mt-4 text-sm">
                                     <p className="font-medium mb-2 text-base">Model Answer Guide:</p>
                                      <div className="space-y-2.5">
                                        {bulletPoints.map((point, pointIndex) => (
                                          <div key={pointIndex} className="flex items-start gap-3">
                                            <Checkbox
                                              id={`q-${index}-${qIndex}-p-${pointIndex}`}
                                              aria-label="Mark as covered"
                                              className="mt-1 flex-shrink-0"
                                            />
                                            <label
                                              htmlFor={`q-${index}-${qIndex}-p-${pointIndex}`}
                                              className="text-sm text-muted-foreground leading-snug"
                                            >
                                              {point.replace(/^[-*]\s*/, '')}
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                      {note && (
                                        <p className="mt-4 text-xs italic text-muted-foreground/90 bg-muted/50 p-2 rounded-md border">{note}</p>
                                      )}
                                   </div>
                                 </div>
                               )
                              })}
                           </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Scoring Rubric</h2>
                  <Card>
                    <CardContent className="p-6">
                      <ul className="space-y-4">
                        {interviewKit.scoringRubric.map((criterion, index) => (
                          <li key={index} className="flex justify-between items-start gap-4 p-3 rounded-lg bg-background border">
                            <span className="flex-1 text-sm">{criterion.criterion}</span>
                            <span className="ml-4 font-bold text-primary whitespace-nowrap">{(criterion.weight * 100).toFixed(0)}%</span>
                          </li>
                        ))}
                      </ul>
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
