import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-xl text-slate-900">AutoGradeX</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/signin">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Get Started Free
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Documentation
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to get started with AutoGradeX and make the most of our platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Quick Start Guide</h3>
                <p className="text-slate-600 mb-4">
                  Get up and running with AutoGradeX in just a few minutes.
                </p>
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
                  Read more →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Creating Assignments</h3>
                <p className="text-slate-600 mb-4">
                  Learn how to create and configure assignments for your courses.
                </p>
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
                  Read more →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Building Rubrics</h3>
                <p className="text-slate-600 mb-4">
                  Create effective rubrics that help our AI grade consistently.
                </p>
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
                  Read more →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Analytics & Reports</h3>
                <p className="text-slate-600 mb-4">
                  Understand student performance with detailed analytics.
                </p>
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
                  Read more →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">API Reference</h3>
                <p className="text-slate-600 mb-4">
                  Integrate AutoGradeX with your existing systems via our API.
                </p>
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
                  Read more →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">FAQs</h3>
                <p className="text-slate-600 mb-4">
                  Find answers to commonly asked questions about AutoGradeX.
                </p>
                <Link href="/help" className="text-blue-600 hover:text-blue-700 font-medium">
                  Read more →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900">
        <div className="container mx-auto max-w-6xl text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} AutoGradeX. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
