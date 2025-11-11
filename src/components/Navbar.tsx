import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Edit2, Search, Home as HomeIcon, ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch cart count
  useEffect(() => {
    const fetchCartCount = async () => {
      if (!user) return;
      const { count } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setCartCount(count || 0);
    };
    fetchCartCount();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const handleUserUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) alert(error.message);
    }
    if (password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) alert(error.message);
    }
    if (fullName) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) alert(error.message);
    }

    alert('Profile updated!');
    setShowUserMenu(false);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ShopVibe" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">ShopVibe</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex flex-1 items-center justify-end gap-4">
            <form onSubmit={handleSearch} className="flex flex-1 max-w-xl">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none"
              />
              <Button type="submit" className="px-4 bg-primary rounded-r-md">
                <Search className="h-5 w-5 text-white" />
              </Button>
            </form>

            <Link to="/">
              <Button className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 flex items-center gap-1">
                <HomeIcon className="h-4 w-4" /> Home
              </Button>
            </Link>

            <Button variant="outline" className="relative" onClick={() => navigate('/cart')}>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>

            {user ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex items-center gap-1"
                >
                  <User className="h-5 w-5" /> {user.email?.split('@')[0]}
                </Button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-md shadow-lg p-4 z-50">
                    <form onSubmit={handleUserUpdate} className="space-y-3">
                      <input type="text" name="name" defaultValue={user.user_metadata?.full_name || ''} className="w-full px-2 py-1 border rounded" />
                      <input type="email" name="email" defaultValue={user.email} className="w-full px-2 py-1 border rounded" />
                      <input type="password" name="password" placeholder="New password" className="w-full px-2 py-1 border rounded" />
                      <div className="flex justify-between items-center">
                        <Button type="submit" className="flex-1 bg-gradient-hero flex items-center gap-1">
                          <Edit2 className="h-4 w-4" /> Update
                        </Button>
                        <Button type="button" variant="outline" onClick={handleLogout}>
                          <LogOut className="h-4 w-4" /> Logout
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth?role=user">
                <Button className="bg-gradient-hero">Login</Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" onClick={() => setMobileMenuOpen((prev) => !prev)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden flex flex-col gap-2 mt-2 pb-4 border-t border-border">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none"
              />
              <Button type="submit" className="bg-primary w-full flex items-center justify-center gap-2">
                <Search className="h-5 w-5 text-white" /> Search
              </Button>
            </form>
            <Link to="/">
              <Button className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 w-full flex items-center gap-1">
                <HomeIcon className="h-4 w-4" /> Home
              </Button>
            </Link>
            <Button variant="outline" className="relative w-full flex justify-center" onClick={() => navigate('/cart')}>
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
            {user ? (
              <Button variant="ghost" onClick={() => setShowUserMenu((prev) => !prev)}>
                <User className="h-5 w-5" /> {user.email?.split('@')[0]}
              </Button>
            ) : (
              <Link to="/auth?role=user">
                <Button className="bg-gradient-hero w-full">Login</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
