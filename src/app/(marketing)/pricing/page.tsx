'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Building2, Users, BarChart3, HeadphonesIcon, Smartphone, Code, Palette, Wrench, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { billingAPI } from '@/lib/billing';

interface PricingPlan {
  id: 'starter' | 'growth' | 'professional';
  name: string;
  price: number;
  description: string;
  features: Array<{
    icon: React.ComponentType<any>;
    text: string;
    highlight?: boolean;
  }>;
  popular?: boolean;
  buttonText: string;
  buttonVariant: 'default' | 'outline' | 'secondary';
}

const pricingPlans: PricingPlan[] = [
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
    buttonVariant: 'outline',
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
    buttonText: 'Most Popular',
    buttonVariant: 'default',
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
    buttonVariant: 'secondary',
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token && token !== 'null' && token !== 'undefined');
  }, []);

  const handleGetStarted = async (planId: string) => {
    setLoading(planId);
    
    try {
      // Check if user is logged in
      const token = localStorage.getItem('access_token');
      const isAuthenticated = token && token !== 'null' && token !== 'undefined';
      
      if (!isAuthenticated) {
        // Redirect to register page if not logged in
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Scale your property management business with our flexible pricing plans. 
            Start small and grow as your portfolio expands.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
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
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <li key={index} className="flex items-start">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                            feature.highlight ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Check className={`h-3 w-3 ${
                              feature.highlight ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex items-center">
                            <FeatureIcon className="h-4 w-4 text-gray-500 mr-2" />
                            <span className={`text-sm ${
                              feature.highlight ? 'text-green-700 font-medium' : 'text-gray-700'
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
                    variant={plan.buttonVariant as any}
                    onClick={() => handleGetStarted(plan.id)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      isLoggedIn === false ? 'Sign Up to Start' : plan.buttonText
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and we'll prorate any billing differences.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens if I exceed my property limit?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You'll be charged the additional door fee for each property over your limit. 
                  You can upgrade your plan anytime to get better rates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! We offer a 14-day free trial for all plans. No credit card required to get started.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We accept all major credit cards, PayPal, and bank transfers. 
                  All payments are processed securely through Stripe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">
                Ready to Transform Your Property Management?
              </h3>
              <p className="text-blue-100 mb-6">
                Join thousands of property managers who trust RentalAi to streamline their operations.
              </p>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => handleGetStarted('growth')}
                disabled={loading === 'growth'}
              >
                Start Your Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
