'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  Building2, 
  Lightbulb, 
  Shield, 
  Users, 
  MapPin,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Heart
} from 'lucide-react';

export default function AboutPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
  }, []);

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/register');
    }
  };

  const handleGetInTouch = () => {
    router.push('/register');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const values = [
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Cutting-edge AI technology",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100"
    },
    {
      icon: Shield,
      title: "Reliability", 
      description: "99.9% uptime guarantee",
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconBg: "bg-green-100"
    },
    {
      icon: Users,
      title: "Customer Success",
      description: "Dedicated support team",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-100"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">RentalAi</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </a>
              <a href="/about" className="text-blue-600 font-medium">
                About
              </a>
              <a href="/#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="/#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </a>
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="fixed inset-0 z-50">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeMobileMenu} />
              <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-6 border-b">
                    <span className="text-lg font-semibold text-gray-900">Menu</span>
                    <button
                      onClick={closeMobileMenu}
                      className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 px-6 py-6 space-y-6">
                    <a
                      href="/"
                      className="block text-lg text-gray-600 hover:text-gray-900 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Home
                    </a>
                    <a
                      href="/about"
                      className="block text-lg text-blue-600 font-medium"
                      onClick={closeMobileMenu}
                    >
                      About
                    </a>
                    <a
                      href="/#features"
                      className="block text-lg text-gray-600 hover:text-gray-900 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Features
                    </a>
                    <a
                      href="/#pricing"
                      className="block text-lg text-gray-600 hover:text-gray-900 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Pricing
                    </a>
                  </div>
                  <div className="p-6 border-t space-y-3">
                    <Button variant="outline" className="w-full" onClick={handleSignIn}>
                      Sign In
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" onClick={handleGetStarted}>
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6 sm:mb-8">
            <Star className="h-4 w-4 mr-2" />
            About RentalAi
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            About{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              RentalAi
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto">
            We're revolutionizing property management through intelligent automation, 
            helping property managers scale their operations and maximize their potential.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 sm:mb-8">
            <Zap className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            Our Mission
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Empowering property managers with AI-powered automation to streamline operations, 
            reduce costs, and scale effortlessly.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mb-6 sm:mb-8">
              <Heart className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
              Our Story
            </h2>
          </div>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="text-lg sm:text-xl leading-relaxed mb-4 sm:mb-6">
              RentalAi was born from a simple yet powerful vision: to transform the property management 
              industry through intelligent automation. Our founders, having experienced the challenges 
              of managing multiple properties firsthand, recognized the need for a solution that could 
              handle the complexity of modern property management.
            </p>
            
            <p className="text-lg sm:text-xl leading-relaxed mb-4 sm:mb-6">
              We built RentalAi to solve the pain points that every property manager faces - from 
              document processing and tenant communication to maintenance coordination and financial 
              tracking. By leveraging cutting-edge AI technology, we've created a platform that not 
              only automates routine tasks but also provides intelligent insights to help you make 
              better decisions.
            </p>
            
            <p className="text-lg sm:text-xl leading-relaxed">
              Today, we're proud to serve hundreds of property managers across the country, helping 
              them streamline their operations, reduce costs, and focus on what matters most - 
              growing their business and serving their tenants.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
              Our Values
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do at RentalAi
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${value.iconBg} rounded-2xl mb-6`}>
                    <value.icon className={`h-8 w-8 ${value.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {value.title}
                  </h3>
                  
                  <p className="text-gray-600 text-lg">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl mb-6 sm:mb-8">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            Get in Touch
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Based in Tulsa, Oklahoma, we're here to help you transform your property management operations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleGetInTouch}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg"
            >
              Get in Touch
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <span>Tulsa, Oklahoma</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">RentalAi</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                AI-powered property management platform that streamlines operations, 
                reduces costs, and helps you scale effortlessly.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="/#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Sign In</a></li>
                <li><a href="/register" className="hover:text-white transition-colors">Get Started</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 RentalAi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
