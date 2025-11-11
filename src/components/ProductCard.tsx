import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
}

export const ProductCard = ({ id, name, price, images, description }: ProductCardProps) => {
  const addToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to add items to cart');
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
    }
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in-up border-border">
      <Link to={`/product/${id}`} className="block">
        <div className="relative overflow-hidden aspect-square cursor-pointer">
          <img
            src={images[0] || '/placeholder.svg'}
            alt={name}
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/product/${id}`} className="block">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1 hover:underline">{name}</h3>
        </Link>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            ${price.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Link to={`/product/${id}`}>
              <Button size="sm" variant="outline" className="hover:bg-primary/10">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              size="sm" 
              onClick={addToCart}
              className="bg-gradient-accent hover:opacity-90"
              data-track="add_to_cart_click"
              data-track-meta={`{\"product_id\":\"${id}\"}`}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
