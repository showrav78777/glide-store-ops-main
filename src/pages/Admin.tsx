'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Upload,
  Package,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

export default function Admin() {
  const navigate = useNavigate();

  /* ---------- state ---------- */
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [orders, setOrders] = useState<Tables<'orders'>[]>([]);
  const [activities, setActivities] = useState<
    Array<{
      id: string;
      event_type: string;
      created_at: string;
      page_url: string;
      event_data: Record<string, unknown> | null;
      profiles?: { full_name: string };
    }>
  >([]);
  const [editingProduct, setEditingProduct] = useState<Tables<'products'> | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [] as string[],
    featured: false,
  });

  /* ---------- admin check ---------- */
  const checkAdmin = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return navigate('/auth');

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!data) {
      toast.error('Access denied. Admin only.');
      return navigate('/');
    }

    setIsAdmin(true);
    await Promise.all([fetchProducts(), fetchOrders(), fetchActivities()]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  /* ---------- fetchers ---------- */
  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const fetchActivities = async () => {
    // Step 1: Fetch only user_activity fields (no invalid join)
    const { data, error } = await supabase
      .from('user_activity')
      .select('id, event_type, created_at, page_url, event_data, user_id')
      .order('created_at', { ascending: false })
      .limit(100);
  
    if (error) {
      toast.error('Failed to load activities');
      console.error(error);
      return;
    }
  
    if (!data) {
      setActivities([]);
      return;
    }
  
    // Step 2: For each activity, fetch full_name from profiles if user_id exists
    const enrichedActivities = await Promise.all(
      data.map(async (activity) => {
        let full_name: string | undefined;
  
        if (activity.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', activity.user_id)
            .single();
  
          full_name = profile?.full_name ?? undefined;
        }
  
        return {
          id: activity.id,
          event_type: activity.event_type,
          created_at: activity.created_at,
          page_url: activity.page_url,
          event_data: activity.event_data as Record<string, unknown> | null,
          profiles: full_name ? { full_name } : undefined,
        };
      })
    );
  
    setActivities(enrichedActivities);
  };

  /* ---------- product form ---------- */
  const uploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() ?? '';
      const name = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(name, file);
      if (error) {
        toast.error(`Failed: ${file.name}`);
        continue;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(name);
      urls.push(data.publicUrl);
    }

    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
    toast.success('Images uploaded');
  };

  const removeImage = (idx: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const resetForm = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      description: '',
      price: '',
      category: '',
      stock: '',
      images: [],
      featured: false,
    });
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.images.length) return toast.error('Upload at least one image');

    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      stock: parseInt(form.stock, 10),
      images: form.images,
      featured: form.featured,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);
      if (error) toast.error('Update failed');
      else {
        toast.success('Product updated');
        resetForm();
        fetchProducts();
      }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) toast.error('Create failed');
      else {
        toast.success('Product created');
        resetForm();
        fetchProducts();
      }
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else {
      toast.success('Product deleted');
      fetchProducts();
    }
  };

  const startEdit = (p: Tables<'products'>) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      category: p.category,
      stock: p.stock.toString(),
      images: p.images,
      featured: p.featured,
    });
  };

  /* ---------- order status ---------- */
  const changeOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) return toast.error('Status update failed');

    toast.success('Status updated');
    fetchOrders();

    // ----- reduce stock when delivered -----
    if (status === 'delivered') {
      const order = orders.find((o) => o.id === orderId);
      if (!order?.order_items) return;

      for (const it of order.order_items as any[]) {
        const prod = products.find((p) => p.id === it.product_id);
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: prod.stock - it.quantity })
            .eq('id', prod.id);
        }
      }
      fetchProducts();
    }
  };

  /* ---------- render ---------- */
  if (loading)
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">
          Admin <span className="bg-gradient-hero bg-clip-text text-transparent">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mb-8">Manage products, orders & analytics</p>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ==================== PRODUCTS ==================== */}
          <TabsContent value="products">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* ---- form ---- */}
              <Card className="p-6 lg:col-span-1">
                <h2 className="text-2xl font-bold mb-6">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>

                <form onSubmit={submitProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="desc">Description</Label>
                    <Textarea
                      id="desc"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock">Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cat">Category</Label>
                    <Input
                      id="cat"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="feat"
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="feat">Featured product</Label>
                  </div>

                  {/* ---- images ---- */}
                  <div>
                    <Label>Images</Label>
                    <div className="space-y-3">
                      <div>
                        <Input
                          id="img-input"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={uploadImages}
                          disabled={uploading}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('img-input')?.click()}
                          disabled={uploading}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Uploading…' : 'Upload Images'}
                        </Button>
                      </div>

                      {form.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {form.images.map((url, i) => (
                            <div key={i} className="relative group">
                              <img
                                src={url}
                                alt={`#${i + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                                onClick={() => removeImage(i)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-gradient-hero">
                      {editingProduct ? 'Update' : 'Create'}
                    </Button>
                    {editingProduct && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              {/* ---- list ---- */}
              <div className="lg:col-span-2 space-y-4">
                {products.map((p) => (
                  <Card key={p.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      <img
                        src={p.images[0] || '/placeholder.svg'}
                        alt={p.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {p.name}
                          {p.featured && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                              Featured
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">{p.category}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="font-bold text-primary">${p.price}</span>
                          <span className="text-sm text-muted-foreground">
                            Stock: {p.stock}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/product/${p.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProduct(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ORDERS ==================== */}
          <TabsContent value="orders">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Package className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Orders Management</h2>
              </div>

              <OrdersSummary orders={orders} />

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{o.customer_name}</h3>
                        <p className="text-sm text-muted-foreground">{o.phone_number}</p>
                        <p className="text-sm text-muted-foreground mt-1">{o.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ${Number(o.total).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Delivery:</span>{' '}
                        <span className="font-medium">
                          {o.delivery_location === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Charge:</span>{' '}
                        <span className="font-medium">৳{o.delivery_charge}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-semibold mb-1">Items:</p>
                      {(o.order_items as any[]).map((it, i) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          • {it.product_name} x{it.quantity} - $
                          {(it.price * it.quantity).toFixed(2)}
                        </p>
                      ))}
                    </div>

                    <select
                      value={o.status}
                      onChange={(e) => changeOrderStatus(o.id, e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ==================== ANALYTICS ==================== */}
          <TabsContent value="analytics">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">User Activity</h2>
              </div>
              <AnalyticsPanel activities={activities} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* -------------------------------------------------
   Orders Summary (sales, AOV, top products, …)
------------------------------------------------- */
function OrdersSummary({ orders }: { orders: Tables<'orders'>[] }) {
  const init = {
    sales: 0,
    items: 0,
    count: 0,
    subtotals: 0,
    status: {} as Record<string, number>,
    products: {} as Record<string, number>,
  };

  const totals = orders.reduce((acc, o) => {
    const items = (o.order_items as any[]) || [];
    const qty = items.reduce((s, i) => s + i.quantity, 0);
    acc.sales += Number(o.total) || 0;
    acc.subtotals += Number(o.subtotal) || 0;
    acc.items += qty;
    acc.count += 1;
    acc.status[o.status] = (acc.status[o.status] || 0) + 1;

    items.forEach((i) => {
      const name = i.product_name ?? 'Unknown';
      acc.products[name] = (acc.products[name] || 0) + i.quantity;
    });
    return acc;
  }, init);

  const aov = totals.count ? totals.sales / totals.count : 0;
  const profit = totals.sales - totals.subtotals;

  const top5 = Object.entries(totals.products)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Sales</div>
          <div className="text-2xl font-bold">${totals.sales.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Items Sold</div>
          <div className="text-2xl font-bold">{totals.items}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Orders</div>
          <div className="text-2xl font-bold">{totals.count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">AOV</div>
          <div className="text-2xl font-bold">${aov.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Profit (approx)</div>
          <div className="text-2xl font-bold">${profit.toFixed(2)}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-3">Status</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(totals.status).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-semibold mb-3">Top 5 Products</div>
          <div className="space-y-2 text-sm">
            {top5.map(([name, qty]) => (
              <div key={name} className="flex justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium">x{qty}</span>
              </div>
            ))}
            {top5.length === 0 && <div className="text-muted-foreground">No sales yet</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------
   Analytics Panel (event filter + list)
------------------------------------------------- */
function AnalyticsPanel({
  activities,
}: {
  activities: Array<{
    id: string;
    event_type: string;
    created_at: string;
    page_url: string;
    event_data: Record<string, unknown> | null;
    profiles?: { full_name: string };
  }>;
}) {
  const [filter, setFilter] = useState('all');
  const eventTypes = Array.from(new Set(activities.map((a) => a.event_type)));

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.event_type === filter);

  const total = activities.length;
  const last24h = activities.filter(
    (a) => Date.now() - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;
  const pageViews = activities.filter((a) => a.event_type === 'page_view').length;
  const clicks = activities.filter((a) => a.event_type.includes('click')).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total events</div>
          <div className="text-2xl font-bold">{total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Last 24 h</div>
          <div className="text-2xl font-bold">{last24h}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Page views</div>
          <div className="text-2xl font-bold">{pageViews}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Clicks</div>
          <div className="text-2xl font-bold">{clicks}</div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Filter</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filtered.map((a) => (
          <div key={a.id} className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium">{a.event_type}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Page: {a.page_url}</p>
            {a.profiles?.full_name && (
              <p className="text-sm text-muted-foreground">User: {a.profiles.full_name}</p>
            )}
            {a.event_data && (
              <p className="text-sm text-muted-foreground mt-1">
                Data: {JSON.stringify(a.event_data)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}