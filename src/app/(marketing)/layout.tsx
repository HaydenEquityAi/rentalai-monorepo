import { ReactNode } from 'react';

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header for marketing pages */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RA</span>
              </div>
              <span className="text-xl font-bold text-gray-900">RentalAi</span>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </a>
              <a 
                href="/register" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>
      
      <main>
        {children}
      </main>
      
      {/* Simple footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 RentalAi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
