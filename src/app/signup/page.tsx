import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BrainCircuit } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <Link href="/" className="inline-block mb-4" prefetch={false}>
                <BrainCircuit className="h-8 w-8 text-primary" />
            </Link>
          <CardTitle className="text-2xl">Sign Up Not Required</CardTitle>
          <CardDescription>
             This application does not require an account. You can start using it right away.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Button asChild className="w-full">
                <Link href="/">
                    Go to the app
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}
