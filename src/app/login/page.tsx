import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <Link href="/" className="inline-block mb-4" prefetch={false}>
                <Image src="/logo.png" alt="RecruTake Logo" width={32} height={40} className="mx-auto" />
            </Link>
          <CardTitle className="text-2xl">Login Not Required</CardTitle>
          <CardDescription>
            This application does not require a login. You can start using it right away.
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
