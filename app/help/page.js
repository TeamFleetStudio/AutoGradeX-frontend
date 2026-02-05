import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HelpPage() {
  const faqs = [
    {
      question: "How does AI grading work?",
      answer: "AutoGradeX uses advanced AI models to evaluate student submissions against your rubric and reference answers. The AI analyzes the content, structure, and accuracy of responses to provide consistent, detailed feedback within seconds."
    },
    {
      question: "Is AI grading accurate?",
      answer: "Our AI achieves 95%+ accuracy when properly configured with clear rubrics. We recommend that educators review AI grades before releasing them to students, especially for high-stakes assignments."
    },
    {
      question: "What types of assignments can be graded?",
      answer: "AutoGradeX can grade essays, short answers, problem sets, code submissions, and more. Any text-based assignment with clear evaluation criteria works well with our platform."
    },
    {
      question: "Is student data secure?",
      answer: "Yes, we take security seriously. AutoGradeX is FERPA compliant, uses encryption for all data in transit and at rest, and never sells or shares student data with third parties."
    },
    {
      question: "Can I customize the AI's grading behavior?",
      answer: "Absolutely! You can create detailed rubrics, provide reference answers, and adjust grading parameters to match your specific requirements and grading style."
    },
    {
      question: "What if I disagree with an AI grade?",
      answer: "You always have full control. You can review, adjust, or override any AI-generated grade before releasing it to students. The AI is a tool to assist you, not replace your judgment."
    },
    {
      question: "How do I get started?",
      answer: "Sign up for a free account, create your first course and assignment, upload or enter student submissions, and let our AI do the grading. You can start grading within minutes of signing up."
    },
    {
      question: "Is there a free plan?",
      answer: "Yes! Our free plan includes up to 50 submissions per month, perfect for trying out the platform. Upgrade to Pro for unlimited submissions and additional features."
    }
  ];

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

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Help Center
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Find answers to your questions and learn how to get the most out of AutoGradeX.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Documentation</h3>
                <p className="text-slate-600 mb-4">Comprehensive guides and tutorials</p>
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 font-medium">
                  Browse Docs →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Contact Support</h3>
                <p className="text-slate-600 mb-4">Get help from our support team</p>
                <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact Us →
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Community</h3>
                <p className="text-slate-600 mb-4">Connect with other educators</p>
                <Link href="/community" className="text-blue-600 hover:text-blue-700 font-medium">
                  Join Community →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{faq.question}</h3>
                  <p className="text-slate-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Still have questions?
          </h2>
          <p className="text-slate-600 mb-8">
            Our support team is here to help you get the most out of AutoGradeX.
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Contact Support
            </Button>
          </Link>
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
