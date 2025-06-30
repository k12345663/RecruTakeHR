import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileScan, ClipboardList, BookText, BrainCircuit } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        <Link href="#" className="flex items-center gap-2" prefetch={false}>
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">InterviewerAI</span>
        </Link>
        <nav className="hidden lg:flex gap-6 text-sm font-medium">
          <Link href="#features" className="hover:text-primary" prefetch={false}>
            Features
          </Link>
          <Link href="#" className="hover:text-primary" prefetch={false}>
            Pricing
          </Link>
          <Link href="#" className="hover:text-primary" prefetch={false}>
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                Craft the Perfect Interview, Every Time
              </h1>
              <p className="text-lg text-muted-foreground">
                Leverage AI to analyze resumes, generate tailored interview kits, and streamline your hiring process.
              </p>
              <div className="flex justify-center">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-20 md:py-24 bg-card">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Features to Streamline Your Hiring</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground">
                Our AI-powered tools help you identify the best candidates faster.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <FileScan className="w-8 h-8 text-primary" />
                  <CardTitle>AI Resume Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Automatically extract skills, experience, and key qualifications from any resume format to quickly screen candidates.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <ClipboardList className="w-8 h-8 text-primary" />
                  <CardTitle>Custom Interview Kits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Generate tailored interview questions, scoring rubrics, and model answers based on the job description and candidate profile.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <BookText className="w-8 h-8 text-primary" />
                  <CardTitle>JD Summarization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Instantly get a concise summary of any job description, highlighting the core responsibilities and requirements.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t">
        <div className="container mx-auto py-6 px-4 md:px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} InterviewerAI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-primary" prefetch={false}>
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-primary" prefetch={false}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
