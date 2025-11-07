import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Linkedin, Github, Mail, Shield, Globe, Newspaper } from 'lucide-react';

const Team = () => {
  const navigate = useNavigate();
  const team = [
    { name: 'Kshitij Bhatt', role: 'Founder' },
    { name: 'Katherine Rozario', role: 'Founder' },
    { name: 'Farhan Shaikh', role: 'Senior Developer' },
    { name: 'Ananya Murali', role: 'Senior Developer' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="container mx-auto px-4 py-6 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Trustek Shield</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Dashboard</Button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Meet the Team</h1>
          <p className="text-muted-foreground text-lg">Dedicated experts working to protect you from digital threats</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-12">
          {team.map((member) => (
            <Card key={member.name} className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardHeader>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">{member.name}</CardTitle>
                <CardDescription className="font-semibold text-primary">{member.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Innovating for a safer digital world.</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Button variant="ghost" size="icon" className="rounded-full"><Linkedin className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full"><Github className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full"><Mail className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-2">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-2">
                <Newspaper className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Fake News Detection</CardTitle>
              <CardDescription>Analyze articles or text to verify authenticity.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/fake-news-detection')}>Open Fake News Detection</Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-2">
                <Globe className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Website Scanner</CardTitle>
              <CardDescription>Scan websites for phishing and suspicious patterns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/website-scanner')}>Open Website Scanner</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Team;
