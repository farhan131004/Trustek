import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const faqs: { q: string; a: string }[] = [
  { q: 'What is Trustek Shield?', a: 'Trustek Shield is a suite of AI-powered tools to detect fake news, verify websites, and authenticate reviews to help you stay safe online.' },
  { q: 'How does Fake News Detection work?', a: 'We use NLP models to analyze text and infer the likelihood of misinformation, returning a label and confidence score.' },
  { q: 'What is the Website Scanner?', a: 'It checks a website for suspicious patterns and keywords commonly associated with phishing and scams.' },
  { q: 'Do I need an account to use the tools?', a: 'Yes, access to tools is available after sign-in to protect quotas and personalize your experience.' },
  { q: 'Is my data stored?', a: 'We only store minimal telemetry necessary to operate the service. Text you submit may be processed transiently to produce results. See our privacy policy for details.' },
  { q: 'Can I analyze content from my phone?', a: 'Yes. If you are on the same network as your computer running the backend, ensure you configure the app to use your computer\'s IP address.' },
  { q: 'Which languages are supported?', a: 'Primary support is English. Other languages may work but quality can vary depending on model coverage.' },
  { q: 'What is the confidence score?', a: 'It indicates model certainty (0-1). Use it as guidance, not absolute truth.' },
  { q: 'Do you provide sources for verification?', a: 'When available, we surface corroborating sources using search and ranking.' },
  { q: 'Why did a site block scanning?', a: 'Some websites block automated requests. Try providing the article text directly or a different source.' },
  { q: 'Can I upload images for analysis?', a: 'Yes. Use the Fake News from Image option to extract text with OCR and analyze it.' },
  { q: 'Is this suitable for academic use?', a: 'You can use it for research assistance, but always cross-check results and cite original sources.' },
  { q: 'How accurate is the system?', a: 'Accuracy varies by content type and model. Treat outputs as supportive signals, not definitive fact-checks.' },
  { q: 'What browsers are supported?', a: 'Latest versions of Chrome, Edge, and Firefox are supported.' },
  { q: 'Can organizations integrate Trustek Shield?', a: 'Yes. Contact us for enterprise integration options and APIs.' },
  { q: 'How do I report a false result?', a: 'Use the feedback form in the app to submit details and links. We review and improve continuously.' },
  { q: 'Are there rate limits?', a: 'Yes, to ensure fair use. Heavy usage may temporarily throttle requests.' },
  { q: 'Is my account secure?', a: 'We follow best practices for authentication and do not store passwords in plain text.' },
  { q: 'Do you open source any components?', a: 'Some components may be open-sourced over time. Watch our announcements.' },
  { q: 'How can I get support?', a: 'Reach us via the feedback form or email from the contact links on the team page.' },
];

const FAQs = () => {
  const navigate = useNavigate();
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

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg mb-8 text-center">Quick answers about features, privacy, and how to use Trustek Shield.</p>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger className="px-6">{item.q}</AccordionTrigger>
                    <AccordionContent className="px-6 text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FAQs;
