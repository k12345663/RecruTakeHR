
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileUp, Briefcase, RotateCcw } from 'lucide-react';
import { generateInterviewKit, GenerateInterviewKitOutput } from '@/ai/flows/generate-interview-kit';
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from '@/components/theme-toggle';
import { Checkbox } from '@/components/ui/checkbox';

// Helper component to render the model answer with special handling for code blocks
const ModelAnswer = ({ answer, questionId }: { answer: string; questionId: string }) => {
    // Split the answer by the code block delimiter to separate code from text
    const parts = answer.split(/```(?:[a-z]*)?\n/);

    return (
        <div className="space-y-4">
            {parts.map((part, index) => {
                if (index % 2 === 1) {
                    // This is a code block
                    const codeContent = part.trim();
                    const codeBlockId = `${questionId}-code-${index}`;
                    return (
                        <div key={codeBlockId} className="space-y-2">
                           <div className="flex items-start space-x-3">
                                <Checkbox id={codeBlockId} className="mt-1 flex-shrink-0" />
                                <label htmlFor={codeBlockId} className="text-sm font-semibold w-full">Code Snippet:</label>
                           </div>
                           <div className="pl-7 w-full">
                                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm w-full">
                                    <code>{codeContent}</code>
                                </pre>
                           </div>
                        </div>
                    );
                } else {
                    // This is a text section, which may contain bullet points
                    const textContent = part.trim();
                    if (!textContent) return null;

                    const bullets = textContent.split('\n').map(b => b.trim()).filter(b => b.startsWith('-'));

                    if (bullets.length === 0 && textContent.length > 0) {
                        // Handle text that isn't a bulleted list
                        const pointId = `${questionId}-text-${index}`;
                        return (
                             <div key={pointId} className="flex items-start space-x-3">
                                 <Checkbox id={pointId} className="mt-1 flex-shrink-0" />
                                 <label htmlFor={pointId} className="text-sm font-normal w-full">
                                    {textContent}
                                </label>
                            </div>
                        )
                    }

                    return (
                        <div key={`${questionId}-text-section-${index}`} className="space-y-2">
                             {bullets.length > 0 && index === 0 && (
                                 <h5 className="font-semibold text-sm">Explanation:</h5>
                             )}
                             {bullets.map((bullet, bulletIndex) => {
                                const bulletId = `${questionId}-bullet-${index}-${bulletIndex}`;
                                const bulletText = bullet.substring(1).trim();
                                return (
                                    <div key={bulletId} className="flex items-start space-x-3 pl-7">
                                        <Checkbox id={bulletId} className="mt-1 flex-shrink-0" />
                                        <label htmlFor={bulletId} className="text-sm font-normal w-full">
                                            {bulletText}
                                        </label>
                                    </div>
                                );
                             })}
                        </div>
                    );
                }
            })}
        </div>
    );
};


export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [unstopProfileLink, setUnstopProfileLink] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewKit, setInterviewKit] = useState<GenerateInterviewKitOutput | null>(null);
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

  const handleRestart = () => {
    setJobDescription('');
    setUnstopProfileLink('');
    setResumeFile(null);
    setInterviewKit(null);
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
                        Fill out the form on the left to generate a list of technical questions.
                    </p>
                </div>
            )}
            {interviewKit && (
              <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                        <h2 className="text-2xl font-bold">Generated Technical Questions</h2>
                        <Button variant="outline" onClick={handleRestart}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Generate New Kit
                        </Button>
                    </div>
                  <div className="space-y-4">
                    {interviewKit.questions.map((q, index) => (
                      <Card key={q.id}>
                        <CardHeader>
                          <CardTitle>Question {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="font-semibold text-base">{q.question}</p>
                          <div>
                            <h4 className="font-medium mb-2 text-base">Model Answer:</h4>
                             <ModelAnswer answer={q.modelAnswer} questionId={q.id!} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
