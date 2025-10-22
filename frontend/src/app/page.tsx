'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  FileText, 
  Users, 
  Wrench, 
  TrendingUp, 
  Zap, 
  Star, 
  Crown, 
  Check, 
  ArrowRight,
  Play,
  Quote,
  Building2,
  HeadphonesIcon,
  Smartphone,
  Code,
  Palette,
  GraduationCap,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Award,
  Target,
  DollarSign,
  Calendar,
  Home,
  PieChart,
  Settings,
  Bell,
  Mail,
  Phone,
  Globe,
  Lock,
  CheckCircle,
  Menu,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { billingAPI } from '@/lib/billing';

// Feature data
const features = [
  {
    icon: Bot,
    title: 'AI Document Parser',
    description: 'Automatically extract key information from lease agreements and contracts with 99% accuracy.',
    metric: 'Save 10 hours/week',
    color: 'text-purple-600 bg-purple-100',
  },
  {
    icon: FileText,
    title: 'Smart Lease Management',
    description: 'Streamline lease creation, tracking, and renewals with intelligent automation.',
    metric: '99% accuracy',
    color: 'text-blue-600 bg-blue-100',
  },
  {
    icon: Users,
    title: 'Tenant Portal',
    description: 'Self-service portal for tenants to pay rent, submit requests, and communicate.',
    metric: 'Reduce calls by 80%',
    color: 'text-green-600 bg-green-100',
  },
  {
    icon: Wrench,
    title: 'Maintenance Tracking',
    description: 'Track work orders, schedule repairs, and manage vendor relationships efficiently.',
    metric: 'Fix 2x faster',
    color: 'text-orange-600 bg-orange-100',
  },
  {
    icon: TrendingUp,
    title: 'Financial Analytics',
    description: 'Real-time insights into revenue, expenses, and portfolio performance.',
    metric: 'Real-time insights',
    color: 'text-indigo-600 bg-indigo-100',
  },
  {
    icon: Zap,
    title: 'Automated Workflows',
    description: 'Set up custom automation rules to reduce manual work and improve efficiency.',
    metric: 'Set and forget',
    color: 'text-yellow-600 bg-yellow-100',
  },
];

// Pricing plans
const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    description: 'Perfect for small property managers getting started',
    features: [
      { icon: Building2, text: 'Up to 5 properties' },
      { icon: Users, text: '$15/additional door' },
      { icon: HeadphonesIcon, text: 'Email support' },
      { icon: Smartphone, text: 'Mobile app access' },
    ],
    buttonText: 'Get Started',
    buttonVariant: 'outline' as const,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 199,
    description: 'Ideal for growing property management companies',
    features: [
      { icon: Building2, text: 'Up to 25 properties' },
      { icon: Users, text: '$10/additional door' },
      { icon: HeadphonesIcon, text: 'Priority support', highlight: true },
      { icon: Code, text: 'API access' },
      { icon: BarChart3, text: 'Advanced analytics' },
    ],
    popular: true,
    buttonText: 'Start Free Trial',
    buttonVariant: 'default' as const,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 349,
    description: 'For established property management enterprises',
    features: [
      { icon: Building2, text: 'Up to 50 properties' },
      { icon: Users, text: '$8/additional door' },
      { icon: HeadphonesIcon, text: 'Dedicated support', highlight: true },
      { icon: Palette, text: 'White label' },
      { icon: Wrench, text: 'Custom integrations' },
      { icon: GraduationCap, text: 'Onboarding assistance' },
    ],
    buttonText: 'Go Professional',
    buttonVariant: 'secondary' as const,
  },
];

// Testimonials
const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Property Manager',
    company: 'Metro Properties',
    companySize: '200+ units',
    content: 'RentalAi has completely revolutionized our operations. The AI document parser alone saves us 10 hours per week, and our occupancy rate increased by 15% in just 3 months.',
    avatar: 'SJ',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Portfolio Director',
    company: 'Urban Living Group',
    companySize: '500+ units',
    content: 'The analytics dashboard gives us insights we never had before. We\'ve increased our revenue by 30% and reduced maintenance costs by 25% since implementing RentalAi.',
    avatar: 'MC',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Operations Manager',
    company: 'Coastal Realty',
    companySize: '150+ units',
    content: 'The automated workflows have eliminated so much manual work. Our team can now focus on building relationships with tenants instead of drowning in paperwork.',
    avatar: 'ER',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'CEO',
    company: 'Premier Management',
    companySize: '800+ units',
    content: 'RentalAi transformed our entire business model. We went from reactive property management to proactive, data-driven operations that our tenants love.',
    avatar: 'DK',
    rating: 5,
  },
];

// Company logos (placeholder)
const companies = [
  'Metro Properties',
  'Urban Living Group',
  'Coastal Realty',
  'Premier Management',
  'Elite Properties',
  'Metro Realty',
];

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token && token !== 'null' && token !== 'undefined');
  }, []);

  useEffect(() => {
    // Show floating CTA after scrolling past hero
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setShowFloatingCTA(window.scrollY > heroHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle body scroll lock when mobile menu is open
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleGetStarted = async (planId: string) => {
    setLoading(planId);
    
    try {
      // Check if user is logged in
      const token = localStorage.getItem('access_token');
      const isAuthenticated = token && token !== 'null' && token !== 'undefined';
      
      if (!isAuthenticated) {
        // Redirect to register page if not logged in
        setLoading(null); // Reset loading state before redirect
        router.push('/register');
        return;
      }

      // User is logged in, proceed with checkout
      const { url } = await billingAPI.createCheckoutSession(planId as 'starter' | 'growth' | 'professional');
      window.location.href = url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      
      // If it's an authentication error, redirect to login
      if (error.response?.status === 401) {
        toast.error('Please sign in to continue');
        router.push('/login');
      } else {
        toast.error('Failed to start checkout process. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleStartTrial = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/register');
    }
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const getPrice = (price: number) => {
    return isAnnual ? Math.round(price * 12 * 0.8) : price;
  };

  const getPriceText = (price: number) => {
    return isAnnual ? `/year` : `/month`;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMobileNavClick = (href: string) => {
    closeMobileMenu();
    if (href.startsWith('#')) {
      // Handle anchor links
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Handle regular navigation
      router.push(href);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">RentalAi</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 transition-colors"
                aria-label="Toggle mobile menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeMobileMenu}
          />
          
          {/* Mobile Menu */}
          <div className="fixed right-0 top-0 h-full w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">RentalAi</span>
                </div>
                <button
                  onClick={closeMobileMenu}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close mobile menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex-1 px-6 py-6">
                <div className="space-y-2">
                  <button
                    onClick={() => handleMobileNavClick('/')}
                    className="w-full text-left px-4 py-4 text-lg font-medium text-gray-900 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors min-h-[44px] flex items-center"
                  >
                    Home
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/#pricing')}
                    className="w-full text-left px-4 py-4 text-lg font-medium text-gray-900 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors min-h-[44px] flex items-center"
                  >
                    Pricing
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/#features')}
                    className="w-full text-left px-4 py-4 text-lg font-medium text-gray-900 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors min-h-[44px] flex items-center"
                  >
                    Features
                  </button>
                  <button
                    onClick={() => handleMobileNavClick('/about')}
                    className="w-full text-left px-4 py-4 text-lg font-medium text-gray-900 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors min-h-[44px] flex items-center"
                  >
                    About
                  </button>
                </div>
              </nav>
              
              {/* Auth Buttons */}
              <div className="p-6 border-t border-gray-200 space-y-3">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="block w-full text-center px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1">
                  🚀 Now with AI-powered automation
                </Badge>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  AI-Powered
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Property Management</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg">
                  Automate your property management workflow with intelligent AI tools. 
                  Save time, reduce errors, and scale your business effortlessly.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
                  onClick={handleStartTrial}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-3 text-lg font-semibold border-gray-300 hover:bg-gray-50"
                >
                  <Play className="mr-2 h-5 w-5" />
                  View Demo
                </Button>
              </div>
              
              <p className="text-sm text-gray-500">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
            
            {/* Right Content - Enhanced Hero Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                <div className="bg-white rounded-xl p-6 space-y-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <div className="ml-4 text-sm text-gray-500">RentalAi Dashboard</div>
                  </div>
                  
                  {/* Dashboard Content */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-900">Properties</span>
                        </div>
                        <div className="text-lg font-bold text-blue-900 mt-1">24</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-900">Occupancy</span>
                        </div>
                        <div className="text-lg font-bold text-green-900 mt-1">94%</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-900">Revenue</span>
                        </div>
                        <div className="text-lg font-bold text-purple-900 mt-1">$45K</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Recent Activity</span>
                        <Bell className="h-3 w-3 text-gray-500" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">New lease signed - Unit 3B</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">Maintenance completed - Unit 1A</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">Payment received - Unit 2C</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 bg-white rounded-full p-4 shadow-lg animate-bounce">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-full p-4 shadow-lg animate-pulse">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="absolute top-1/2 -right-8 bg-white rounded-full p-3 shadow-lg animate-ping">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="absolute top-1/4 -left-8 bg-white rounded-full p-3 shadow-lg animate-bounce">
                <Home className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to manage properties
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful tools designed to streamline your property management workflow 
              and help you scale your business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-sm min-h-64">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4 flex-grow">
                      {feature.description}
                    </p>
                    <div className="mt-auto">
                      <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-sm font-medium">
                        {feature.metric}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Choose the plan that fits your portfolio size. All plans include our core features 
              with no hidden fees.
            </p>
            
            {/* Annual/Monthly Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Annual
              </span>
              {isAnnual && (
                <Badge className="bg-green-100 text-green-700 border-green-200 ml-2">
                  Save 20%
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => {
              const IconComponent = plan.id === 'starter' ? Star : 
                                   plan.id === 'growth' ? Zap : Crown;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-300 hover:shadow-xl ${
                    plan.popular 
                      ? 'border-blue-500 shadow-lg scale-105' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                      plan.id === 'starter' ? 'bg-yellow-100 text-yellow-600' :
                      plan.id === 'growth' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </CardTitle>
                    
                    <CardDescription className="text-gray-600 mt-2">
                      {plan.description}
                    </CardDescription>
                    
                    <div className="mt-6">
                      <span className="text-5xl font-bold text-gray-900">${getPrice(plan.price)}</span>
                      <span className="text-gray-600 ml-2">{getPriceText(plan.price)}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, index) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <li key={index} className="flex items-start">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                              'highlight' in feature && feature.highlight ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <Check className={`h-3 w-3 ${
                                'highlight' in feature && feature.highlight ? 'text-green-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex items-center">
                              <FeatureIcon className="h-4 w-4 text-gray-500 mr-2" />
                              <span className={`text-sm ${
                                'highlight' in feature && feature.highlight ? 'text-green-700 font-medium' : 'text-gray-700'
                              }`}>
                                {feature.text}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <Button
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : ''
                      }`}
                      variant={plan.buttonVariant}
                      onClick={() => handleGetStarted(plan.id)}
                      disabled={loading === plan.id}
                    >
                      {loading === plan.id ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        isLoggedIn === false ? 'Sign Up to Start' : (isLoggedIn === null ? 'Sign Up to Start' : plan.buttonText)
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Trusted by property managers nationwide
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Join 500+ property managers who have transformed their business with RentalAi
            </p>
          </div>
          
          {/* Company Logos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
            {companies.map((company, index) => (
              <div key={index} className="flex items-center justify-center p-4">
                <div className="text-gray-400 font-semibold text-sm">
                  {company}
                </div>
              </div>
            ))}
          </div>
          
          {/* Testimonials Carousel */}
          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-8 text-center">
                        <div className="flex items-center justify-center mb-6">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <Quote className="h-12 w-12 text-blue-600 mx-auto mb-6" />
                        <p className="text-lg text-gray-700 mb-8 leading-relaxed max-w-2xl mx-auto">
                          "{testimonial.content}"
                        </p>
                        <div className="flex items-center justify-center">
                          <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                            {testimonial.avatar}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                            <div className="text-gray-600">{testimonial.role}, {testimonial.company}</div>
                            <div className="text-sm text-blue-600 font-medium">{testimonial.companySize}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Carousel Controls */}
            <button
              onClick={prevTestimonial}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
            >
              <ChevronRight className="h-6 w-6 text-gray-600" />
            </button>
            
            {/* Dots Indicator */}
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to transform your property management?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join 500+ property managers who increased revenue by 30% and reduced operational costs by 40% with RentalAi.
          </p>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
            <div className="flex items-center space-x-2 text-blue-100">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-100">
              <Lock className="h-5 w-5" />
              <span className="text-sm font-medium">Bank-Level Security</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-100">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-100">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </div>
          
          <div className="space-y-6">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleStartTrial}
            >
              Start Free Trial
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
            <p className="text-blue-100 text-sm">
              No credit card required • 14-day free trial • Cancel anytime • Setup in 5 minutes
            </p>
          </div>
          
          {/* Customer Logos */}
          <div className="mt-16 pt-8 border-t border-blue-400/30">
            <p className="text-blue-200 text-sm mb-6">Trusted by leading property management companies</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-80">
              {companies.map((company, index) => (
                <div key={index} className="text-white font-semibold text-sm">
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">RentalAi</span>
              </div>
              <p className="text-gray-600 max-w-md">
                Streamline your property management with AI-powered tools and comprehensive analytics.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-gray-600 hover:text-gray-900">Features</Link></li>
                <li><Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/ai-tools" className="text-gray-600 hover:text-gray-900">AI Tools</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
                <li><Link href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 RentalAi. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Floating CTA Button */}
      {showFloatingCTA && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 rounded-full"
            onClick={handleStartTrial}
          >
            <ArrowRight className="h-5 w-5 mr-2" />
            Start Free Trial
          </Button>
        </div>
      )}
    </div>
  );
}