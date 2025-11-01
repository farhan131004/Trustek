import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Newspaper, Globe, Star, Users, ArrowRight, Mail, Linkedin, Github, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Newspaper,
      title: 'Fake News Detection',
      description: 'AI-powered analysis to verify news authenticity and identify misinformation',
    },
    {
      icon: Globe,
      title: 'Website Verification',
      description: 'Real-time scanning to detect phishing sites and fraudulent domains',
    },
    {
      icon: Star,
      title: 'Review Authentication',
      description: 'Advanced algorithms to spot fake reviews and manipulated ratings',
    },
  ];

  const team = [
    {
      name: 'Kshitij Bhatt',
      role: 'Founder',
    },
    {
      name: 'Katherine Rozario',
      role: 'Founder',    
    },
    {
      name: 'Farhan Shaikh',
      role: 'Senior Developer',
    },
    {
      name: 'Ananya Murali',
      role: 'Senior Developer',     
    },
  ];

  const handleFeedback = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In a real application, you would send this data to a backend API
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    // Placeholder toast notification for successful feedback submission
    toast({
      title: "Thank you for your feedback!",
      description: "We'll get back to you soon.",
    });
    
    e.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-6 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Trustek Shield</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {/* NEW: Dashboard Button for Development */}
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              size="sm"
              className="text-accent border-accent hover:bg-accent/10"
            >
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Dev Dashboard
            </Button>
            
            <Button onClick={() => navigate(user ? '/dashboard' : '/auth')}>
              {user ? 'Go to Dashboard' : 'Get Started'}
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Cybersecurity Protection</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Protect Yourself from Digital Deception
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Trustek Shield uses advanced AI to detect fake news, verify websites, and authenticate reviews. 
              Stay safe online with our comprehensive protection suite.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="group">
                Join the Community
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Comprehensive Protection</h2>
            <p className="text-muted-foreground text-lg">
              Three powerful tools to keep you safe from digital threats
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature) => (
              <Card 
                key={feature.title}
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-primary/20 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <feature.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* About Us */}
        <section className="container mx-auto px-4 py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">About Trustek Shield</h2>
            <p className="text-lg text-muted-foreground mb-6">
             Trustek Shield was born from a simple mission: to make the internet a safer place for everyone. 
             In an era where misinformation spreads faster than truth, we believe technology should empower people to verify 
             what they see online.Welcome to the first line of defense against digital deception.
            </p>
            <p className="text-lg text-muted-foreground">
              Our team of cybersecurity experts, AI researchers, and ethical hackers have come together to build cutting-edge 
              tools that detect fake news, verify websites, and authenticate reviews. We're committed to transparency, accuracy, 
              and protecting your digital life and helping you navigate the online world with confidence.
            </p>
          </div>
        </section>

        {/* Meet the Team */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Team</h2>
            <p className="text-muted-foreground text-lg">
              Dedicated experts working to protect you from digital threats
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {team.map((member) => (
              <Card 
                key={member.name}
                className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <CardHeader>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-12 w-12 text-primary-foreground" /> 
                  </div>
                  <CardTitle className="text-xl">{member.name}</CardTitle>
                  <CardDescription className="font-semibold text-primary">{member.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Note: Bio field was missing in the data, added simple placeholder */}
                  <p className="text-muted-foreground text-sm">Innovating for a safer digital world.</p> 
                  <div className="flex gap-3 justify-center mt-4">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Github className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Feedback */}
        <section className="container mx-auto px-4 py-20 bg-muted/30">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">We'd Love Your Feedback</h2>
              <p className="text-muted-foreground text-lg">
                Help us improve Trustek Shield. Share your thoughts, suggestions, or report issues.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleFeedback} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="Your name" 
                      required 
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      placeholder="your.email@example.com" 
                      required 
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                    <Textarea 
                      id="message" 
                      name="message" 
                      placeholder="Share your feedback, ideas, or concerns..." 
                      rows={5}
                      required 
                      className="bg-background"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Send Feedback
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Community CTA */}
        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-secondary text-primary-foreground border-0 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10" />
            <CardContent className="relative p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Community</h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Connect with thousands of users protecting themselves from online threats. 
                Get started today and experience the power of Trustek Shield.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/auth')}
                className="group"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Trustek Shield. Protecting your digital life.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
