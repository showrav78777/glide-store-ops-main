import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryLocation: 'inside_dhaka',
  });

  const DELIVERY_CHARGES = {
    inside_dhaka: 60,
    outside_dhaka: 120,
  };

  // ✅ Define before useEffect
  const fetchCartItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate('/auth');
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        product:products (
          id,
          name,
          price
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Cart fetch error:', error);
      toast.error('Failed to load cart');
      navigate('/cart');
    } else if (!data || data.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
    } else {
      setCartItems(data as unknown as CartItem[]);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchCartItems();

    (async () => {
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    })();
  }, [fetchCartItems]);

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please login to continue');
      navigate('/auth');
      return;
    }

    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      toast.error('Please fill out all required fields.');
      setSubmitting(false);
      return;
    }

    const phoneOk = /^[0-9+\-\s()]{8,15}$/.test(formData.phone.trim());
    if (!phoneOk) {
      toast.error('Please enter a valid phone number.');
      setSubmitting(false);
      return;
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const deliveryCharge = DELIVERY_CHARGES[formData.deliveryLocation as keyof typeof DELIVERY_CHARGES];
    const total = subtotal + deliveryCharge;

    const orderItems = cartItems.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_name: formData.name,
        phone_number: formData.phone,
        address: formData.address,
        delivery_location: formData.deliveryLocation,
        delivery_charge: deliveryCharge,
        subtotal,
        total,
        order_items: orderItems,
      });

    if (orderError) {
      console.error('Order insert error:', orderError);
      toast.error('Failed to place order');
      setSubmitting(false);
      return;
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);

    showNotification(
      'Order Confirmed!',
      `Your order of $${total.toFixed(2)} has been placed successfully.`
    );

    toast.success(
      <div className="flex items-center gap-2">
        <Check className="h-5 w-5 text-green-500" />
        <div>
          <p className="font-semibold">Order Placed Successfully!</p>
          <p className="text-sm text-muted-foreground">
            Total: ${total.toFixed(2)} • Delivery: {formData.deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
          </p>
        </div>
      </div>,
      { duration: 5000 }
    );

    setSubmitting(false);
    setTimeout(() => navigate('/'), 500);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const deliveryCharge = DELIVERY_CHARGES[formData.deliveryLocation as keyof typeof DELIVERY_CHARGES];
  const total = subtotal + deliveryCharge;

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

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-hero bg-clip-text text-transparent">Checkout</span>
          </h1>
          <p className="text-muted-foreground">Complete your order with delivery details</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Delivery Information</h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., +880 1XXXXXXXXX"
                      pattern="[0-9+\-\s()]{8,15}"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter your complete delivery address"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label>Delivery Location *</Label>
                    <RadioGroup
                      value={formData.deliveryLocation}
                      onValueChange={(value) => setFormData({ ...formData, deliveryLocation: value })}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="inside_dhaka" id="inside" />
                        <Label htmlFor="inside" className="flex-1 cursor-pointer">
                          <div className="font-semibold">Inside Dhaka</div>
                          <div className="text-sm text-muted-foreground">
                            Delivery Charge: ৳{DELIVERY_CHARGES.inside_dhaka}
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="outside_dhaka" id="outside" />
                        <Label htmlFor="outside" className="flex-1 cursor-pointer">
                          <div className="font-semibold">Outside Dhaka</div>
                          <div className="text-sm text-muted-foreground">
                            Delivery Charge: ৳{DELIVERY_CHARGES.outside_dhaka}
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Charge</span>
                      <span className="font-semibold">৳{deliveryCharge}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-hero"
                  size="lg"
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </Button>
              </Card>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}
