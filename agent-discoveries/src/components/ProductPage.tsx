// ABOUTME: Generic product page component powered by Track E data
// ABOUTME: Fetches landing page data and renders product details, experiments, and CTAs

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingPage, AdExperiment } from "@/types/landing-page";
import { getLandingPageForProduct, getAdExperiments } from "@/lib/landing-page-data";

interface ProductPageProps {
  productId: string;
}

const ProductPage = ({ productId }: ProductPageProps) => {
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [adExperiments, setAdExperiments] = useState<AdExperiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pageData, experimentsData] = await Promise.all([
          getLandingPageForProduct(productId),
          getAdExperiments(productId),
        ]);
        setLandingPage(pageData);
        setAdExperiments(experimentsData);
      } catch (error) {
        console.error('Failed to fetch product data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-2">Loading...</div>
          <div className="text-muted-foreground">Fetching product data</div>
        </div>
      </div>
    );
  }

  if (!landingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-2">Product Not Found</div>
          <div className="text-muted-foreground">Could not load data for product {productId}</div>
        </div>
      </div>
    );
  }

  // Parse pitch markdown into sections (simple parser)
  const parsePitchSections = (markdown: string) => {
    const sections = markdown.split(/^##\s+/m).filter(Boolean);
    const parsed: { title?: string; content: string; items?: string[] }[] = [];

    sections.forEach(section => {
      const lines = section.trim().split('\n');
      const title = lines[0].replace(/^#\s+/, '');
      const content = lines.slice(1).join('\n').trim();

      // Check if content has list items
      const listMatches = content.match(/^[-•→]\s+(.+)$/gm);
      const items = listMatches ? listMatches.map(item => item.replace(/^[-•→]\s+/, '')) : undefined;

      parsed.push({ title: title !== content ? title : undefined, content, items });
    });

    return parsed;
  };

  const pitchSections = parsePitchSections(landingPage.pitch_markdown);
  const mainTitle = pitchSections.find(s => s.title === undefined)?.content || landingPage.product_id;
  const otherSections = pitchSections.filter(s => s.title !== undefined);

  // Find winning experiment (highest CTR)
  const winningExperiment = adExperiments.length > 0
    ? adExperiments.reduce((best, exp) => {
        const currentCTR = parseFloat(exp.ctr.replace('%', ''));
        const bestCTR = parseFloat(best.ctr.replace('%', ''));
        return currentCTR > bestCTR ? exp : best;
      })
    : null;

  const scrollToResults = () => {
    document.getElementById('experiment-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              {mainTitle}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {otherSections[0]?.content || 'Discovered by autonomous agents'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-brand hover:bg-brand-hover text-white text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all">
                {landingPage.call_to_action}
              </Button>
              {adExperiments.length > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToResults}
                  className="text-lg px-8 py-6 rounded-full transition-all"
                >
                  View Experiment Results
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <img
              src={landingPage.hero_image_url}
              alt={mainTitle}
              className="rounded-3xl shadow-2xl w-full"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center italic">
              Autonomously discovered concept. Image generated by AI.
            </p>
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="container mx-auto px-6 py-16 bg-card/50 backdrop-blur">
        <div className="max-w-4xl mx-auto space-y-12">
          {otherSections.slice(1).map((section, index) => (
            <div key={index}>
              <h2 className="text-3xl font-bold mb-6 text-foreground">{section.title}</h2>
              {section.items ? (
                <ul className="space-y-3 text-muted-foreground">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-brand mr-2">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  {section.content.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Experiment Results */}
      {adExperiments.length > 0 && (
        <section id="experiment-results" className="container mx-auto px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-foreground">Market Testing Results</h2>
              <p className="text-xl text-muted-foreground">
                {adExperiments.length} Feature × Market experiments discovered by autonomous agents
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adExperiments.map((experiment, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={experiment.image}
                      alt={`${experiment.feature} for ${experiment.market}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-brand">Feature</span>
                        <span className="text-sm text-foreground">{experiment.feature}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-brand">Market</span>
                        <span className="text-sm text-foreground">{experiment.market}</span>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <h3 className="font-bold text-foreground">{experiment.headline}</h3>
                      <p className="text-sm text-muted-foreground italic">{experiment.caption}</p>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                        <div className="text-lg font-bold text-brand">{experiment.ctr}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">CPL</div>
                        <div className="text-lg font-bold text-brand">{experiment.cpl}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Winner Highlight */}
      {winningExperiment && (
        <section className="container mx-auto px-6 py-16 bg-accent/20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Winning Variant</h2>
            <p className="text-xl text-muted-foreground">
              The <span className="font-bold text-brand">{winningExperiment.feature} × {winningExperiment.market}</span> variant achieved the best performance with <span className="font-bold text-brand">{winningExperiment.ctr} CTR</span> and <span className="font-bold text-brand">{winningExperiment.cpl} CPL</span>.
            </p>
            <p className="text-muted-foreground">
              {winningExperiment.caption}
            </p>
            <Button size="lg" className="bg-brand hover:bg-brand-hover text-white rounded-full px-12 py-6 text-lg">
              Back This Concept
            </Button>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Help Make {mainTitle} Real
          </h2>
          <p className="text-xl text-muted-foreground">
            This concept was autonomously discovered and validated. Your backing determines which agent-discovered products get manufactured.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" className="bg-brand hover:bg-brand-hover text-white text-lg px-12 py-7 rounded-full shadow-lg hover:shadow-xl transition-all">
              {landingPage.call_to_action}
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-12 py-7 rounded-full transition-all">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductPage;
