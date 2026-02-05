import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BlogPage() {
  const posts = [
    {
      title: "The Future of AI in Education: Beyond Automation",
      excerpt: "Explore how artificial intelligence is transforming education, not by replacing teachers, but by empowering them to focus on what matters most.",
      date: "January 25, 2026",
      category: "AI & Education",
      readTime: "5 min read"
    },
    {
      title: "5 Tips for Creating Effective Grading Rubrics",
      excerpt: "Learn how to design rubrics that improve grading consistency and provide valuable feedback to students.",
      date: "January 20, 2026",
      category: "Best Practices",
      readTime: "4 min read"
    },
    {
      title: "How One Professor Saved 15 Hours Per Week with AI Grading",
      excerpt: "A case study on how Dr. Sarah Chen implemented AutoGradeX in her Introduction to Psychology course.",
      date: "January 15, 2026",
      category: "Case Study",
      readTime: "6 min read"
    },
    {
      title: "Addressing Bias in AI Grading Systems",
      excerpt: "An in-depth look at how we ensure fairness and reduce bias in our AI grading algorithms.",
      date: "January 10, 2026",
      category: "Technology",
      readTime: "7 min read"
    },
    {
      title: "The Importance of Timely Feedback in Student Learning",
      excerpt: "Research shows that faster feedback leads to better learning outcomes. Here's how AI can help.",
      date: "January 5, 2026",
      category: "Research",
      readTime: "4 min read"
    },
    {
      title: "Getting Started with AutoGradeX: A Complete Guide",
      excerpt: "A step-by-step tutorial for setting up your first course and grading your first batch of assignments.",
      date: "January 1, 2026",
      category: "Tutorial",
      readTime: "8 min read"
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
            Blog
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Insights, tutorials, and best practices for modern educators using AI-powered grading.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <Card key={index} className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {post.category}
                    </span>
                    <span className="text-slate-400 text-sm">{post.readTime}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{post.date}</span>
                    <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      Read more →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-slate-600 mb-6">
            Get the latest insights on AI in education delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button className="bg-blue-600 hover:bg-blue-700">
              Subscribe
            </Button>
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
