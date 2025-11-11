import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ArrowRight, Sparkles, TrendingUp, Shield } from 'lucide-react';
import heroBanner from '@/assets/hero-banner.jpg';
import type { Tables } from '@/integrations/supabase/types';

export default function Home() {
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const { trackActivity } = useActivityTracking();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    if (!error && data) {
      setProducts(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Welcome to ShopVibe</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Discover Your
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Perfect </span>
                Style
              </h1>
              <p className="text-xl text-muted-foreground">
                Shop the latest trends with confidence. Quality products, amazing prices, and exceptional service.
              </p>
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-hero hover:opacity-90 shadow-glow group"
                  onClick={() => trackActivity('cta_click', { button: 'shop_now' })}
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="hover:bg-primary/10">
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative animate-fade-in">
              <img
                src={heroBanner}
                alt="Hero Banner"
                className="rounded-3xl shadow-2xl hover:shadow-glow transition-shadow duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-hero rounded-2xl mb-4">
                <TrendingUp className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Latest Trends</h3>
              <p className="text-muted-foreground">Stay ahead with our curated collection</p>
            </div>
            
            <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-accent rounded-2xl mb-4">
                <Shield className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Shopping</h3>
              <p className="text-muted-foreground">Your data is safe with us</p>
            </div>
            
            <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-hero rounded-2xl mb-4">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Quality Products</h3>
              <p className="text-muted-foreground">Only the best for our customers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-4xl font-bold mb-4">
              Featured <span className="bg-gradient-accent bg-clip-text text-transparent">Products</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Discover our handpicked selection of amazing products
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <div key={product.id} style={{ animationDelay: `${index * 0.1}s` }}>
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
