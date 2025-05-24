import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { Leaf, ShoppingCart, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-12 p-4 text-center">
      <section className="mt-8 md:mt-16">
         <Leaf className="h-16 w-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">Welcome to Agroverse</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Empowering farmers with AI-driven insights, a thriving marketplace, and educational resources for sustainable agriculture.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </section>

      <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <Card>
          <CardHeader>
            <Leaf className="h-8 w-8 text-primary mb-2" />
            <CardTitle>AI-Powered Insights</CardTitle>
            <CardDescription>Leverage sensor data and AI analysis for smarter farming decisions and optimized yields.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Placeholder for a small relevant image or icon emphasis */}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <ShoppingCart className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Marketplace</CardTitle>
            <CardDescription>Buy and sell agricultural products directly. List your produce or bid on items you need.</CardDescription>
          </CardHeader>
           <CardContent>
             {/* Placeholder */}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <GraduationCap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Learn & Grow</CardTitle>
            <CardDescription>Access educational content and resources to stay updated on the latest agricultural practices.</CardDescription>
          </CardHeader>
           <CardContent>
            {/* Placeholder */}
          </CardContent>
        </Card>
      </section>

       <section className="w-full max-w-4xl">
         <Image
           src="https://picsum.photos/1200/400?random=1" // Replace with a relevant hero image
           alt="Agricultural Landscape"
           width={1200}
           height={400}
           className="rounded-lg shadow-md object-cover"
           data-ai-hint="agriculture landscape farm field"
         />
      </section>

    </div>
  );
}
