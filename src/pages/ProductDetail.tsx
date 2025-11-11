import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import type { Tables } from '@/integrations/supabase/types';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Tables<'products'> | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackActivity } = useActivityTracking();

  const fetchProduct = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setProduct(data);
      trackActivity('product_view', { product_id: id, product_name: data.name });
    }
    setLoading(false);
  }, [id, trackActivity]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const addToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to add items to cart');
      navigate('/auth');
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { user_id: user.id, product_id: id, quantity: 1 },
        { onConflict: 'user_id,product_id' }
      );

    if (error) {
      toast.error('Failed to add to cart');
    } else {
      toast.success('Added to cart!');
      trackActivity('add_to_cart', { product_id: id });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 hover:bg-primary/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-2 gap-12 animate-fade-in-up">
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={product.images[0] || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.slice(1, 5).map((img: string, idx: number) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <img src={img} alt={`${product.name} ${idx + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>
              <div className="mt-3">
                <span className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {product.category}
                </span>
                {product.featured && (
                  <span className="inline-flex px-3 py-1 rounded-full bg-accent/10 text-accent ml-2 text-xs font-medium">
                    Featured
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-semibold mb-2">Category</h3>
              <span className="inline-flex px-4 py-2 bg-primary/10 rounded-full text-primary font-medium">
                {product.category}
              </span>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                size="lg"
                onClick={addToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-gradient-hero hover:opacity-90 shadow-glow"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="hover:bg-primary/10"
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
