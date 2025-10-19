import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Building2, Users, BarChart3, FileText, Wrench } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">RentalAi</span>
        </div>
        <nav className="ml-auto flex gap-4">
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                AI-Powered Property Management
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Streamline your rental business with intelligent automation, 
                document parsing, and comprehensive analytics.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/register">
                <Button size="lg">Start Free Trial</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">Demo Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Everything You Need
              </h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Comprehensive tools for modern property managers
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
            <Card>
              <CardHeader>
                <Bot className="h-10 w-10 text-indigo-600" />
                <CardTitle>AI Document Parser</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Upload lease documents and automatically extract key information 
                  with 95%+ accuracy using advanced AI.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Building2 className="h-10 w-10 text-indigo-600" />
                <CardTitle>Property Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Manage your entire portfolio with detailed property information, 
                  unit tracking, and maintenance scheduling.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-indigo-600" />
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  Get insights into occupancy rates, revenue trends, and 
                  performance metrics across your portfolio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">© 2024 RentalAi. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
