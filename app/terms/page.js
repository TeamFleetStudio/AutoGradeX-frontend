import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
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
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Terms of Service
          </h1>
          <p className="text-slate-500 mb-12">Last updated: January 28, 2026</p>
          
          <div className="prose prose-lg prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 mb-6">
              By accessing or using AutoGradeX (&quot;the Service&quot;), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-slate-600 mb-6">
              AutoGradeX is an AI-powered grading platform that helps educators grade assignments 
              efficiently while providing personalized feedback to students. The Service includes 
              assignment management, AI-powered grading, feedback generation, and analytics features.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-slate-600 mb-4">To use the Service, you must:</p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 18 years old or have parental/guardian consent</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-600 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload content that infringes intellectual property rights</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service&apos;s operation</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Misrepresent AI-generated grades as human-generated without disclosure</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. AI Grading Disclaimer</h2>
            <p className="text-slate-600 mb-6">
              AutoGradeX uses artificial intelligence to assist with grading. While we strive for 
              accuracy, AI-generated grades and feedback are suggestions and should be reviewed 
              by educators. We recommend that instructors review AI grades before releasing them 
              to students. AutoGradeX is not responsible for any academic decisions made based 
              solely on AI-generated assessments.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-600 mb-6">
              The Service and its original content, features, and functionality are owned by 
              AutoGradeX and are protected by international copyright, trademark, and other 
              intellectual property laws. You retain ownership of content you upload to the Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Subscription and Payment</h2>
            <p className="text-slate-600 mb-4">For paid subscriptions:</p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>Subscriptions automatically renew unless cancelled</li>
              <li>Refunds are provided in accordance with our refund policy</li>
              <li>We may change pricing with 30 days&apos; notice</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Termination</h2>
            <p className="text-slate-600 mb-6">
              We may terminate or suspend your account immediately, without prior notice, for 
              conduct that we believe violates these Terms or is harmful to other users, us, or 
              third parties, or for any other reason at our sole discretion. Upon termination, 
              your right to use the Service will immediately cease.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-slate-600 mb-6">
              To the maximum extent permitted by law, AutoGradeX shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including 
              loss of profits, data, or other intangible losses, resulting from your use of 
              the Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Changes to Terms</h2>
            <p className="text-slate-600 mb-6">
              We reserve the right to modify these Terms at any time. We will notify users of 
              material changes via email or through the Service. Your continued use of the 
              Service after such modifications constitutes acceptance of the updated Terms.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Contact Us</h2>
            <p className="text-slate-600 mb-6">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-slate-600 mb-6">
              <strong>Email:</strong> legal@autogradex.com<br />
              <strong>Address:</strong> AutoGradeX Inc., 123 Education Lane, San Francisco, CA 94102
            </p>
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
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
