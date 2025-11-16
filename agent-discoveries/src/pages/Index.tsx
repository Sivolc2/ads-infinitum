import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import heroProduct from "@/assets/hero-product.jpg";
import pocketMellow from "@/assets/pocket-mellow.jpg";
import glowSips from "@/assets/glowsips.jpg";

const Index = () => {
  const products = [
    {
      id: 1,
      title: "MindLink Companion",
      description: "AI-powered personal companion that adapts to your emotional state and daily needs.",
      image: heroProduct,
      cpl: "$3.20",
      targetPrice: "$49",
      targetAudience: "Young professionals & students",
      link: "/mindlink-companion",
      available: true
    },
    {
      id: 2,
      title: "Pocket Mellow",
      description: "A stress-melting squish animal with mood scent capsules that releases calming scents when squeezed.",
      image: pocketMellow,
      cpl: "$2.85",
      targetPrice: "$24",
      targetAudience: "Gen-Z women & students",
      link: "/pocket-mellow",
      available: true
    },
    {
      id: 3,
      title: "GlowSips",
      description: "A color-changing infusion straw that makes every drink a moment of wonder with natural flavor drops.",
      image: glowSips,
      cpl: "$3.10",
      targetPrice: "$18",
      targetAudience: "Parents & café millennials",
      link: "/glowsips",
      available: true
    },
    {
      id: 4,
      title: "Pocket Mellow (Track E)",
      description: "Dynamic product page powered by Track E backend. Same product as above, but fetched from the API!",
      image: pocketMellow,
      cpl: "$2.85",
      targetPrice: "$24",
      targetAudience: "Gen-Z women & students",
      link: "/test-product",
      available: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Ad Infinitum
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Concepts discovered, tested, and validated by autonomous agents running real ads and experiments.
          </p>
        </div>
      </section>

      {/* Product Gallery */}
      <section className="container mx-auto px-6 py-12 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-border h-full flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img 
                  src={product.image} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-brand text-primary-foreground font-bold text-sm px-4 py-2 shadow-lg">
                    CPL: {product.cpl}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="text-2xl font-bold text-foreground leading-tight">
                  {product.title}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground leading-relaxed">
                  {product.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4 space-y-2 flex-grow">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Target Price:</span> {product.targetPrice}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Target Audience:</span> {product.targetAudience}
                </p>
              </CardContent>

              <CardFooter>
                {product.available ? (
                  <Button 
                    asChild
                    className="w-full rounded-full bg-brand hover:bg-brand-hover text-white font-semibold py-6"
                  >
                    <Link to={product.link}>
                      View Product
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="w-full rounded-full py-6 font-semibold"
                    variant="secondary"
                  >
                    Coming Soon
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
