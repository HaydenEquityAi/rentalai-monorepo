'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Search, Bot, BarChart3, GitCompare, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface AITool {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  color: string;
  status: 'available' | 'coming_soon';
}

const aiTools: AITool[] = [
  {
    id: 'parse-lease',
    title: 'Parse Lease Document',
    description: 'Upload and automatically extract key information from lease agreements with 95%+ accuracy.',
    icon: FileText,
    href: '/ai/parse',
    color: 'bg-blue-500',
    status: 'available',
  },
  {
    id: 'parse-pma',
    title: 'Parse Property Management Agreement',
    description: 'Extract terms, fees, and obligations from property management contracts.',
    icon: FileText,
    href: '/ai/parse-pma',
    color: 'bg-green-500',
    status: 'available',
  },
  {
    id: 'analyze-risks',
    title: 'Analyze Document Risks',
    description: 'Identify potential legal risks and compliance issues in your documents.',
    icon: AlertTriangle,
    href: '/ai/analyze-risks',
    color: 'bg-red-500',
    status: 'coming_soon',
  },
  {
    id: 'summarize',
    title: 'Summarize Document',
    description: 'Generate concise summaries of lengthy legal documents and contracts.',
    icon: Search,
    href: '/ai/summarize',
    color: 'bg-purple-500',
    status: 'coming_soon',
  },
  {
    id: 'compare',
    title: 'Compare Two Documents',
    description: 'Side-by-side comparison highlighting differences between similar documents.',
    icon: GitCompare,
    href: '/ai/compare',
    color: 'bg-orange-500',
    status: 'coming_soon',
  },
  {
    id: 'chat-assistant',
    title: 'AI Chat Assistant',
    description: 'Get instant answers to property management questions and document queries.',
    icon: MessageSquare,
    href: '/ai/chat',
    color: 'bg-indigo-500',
    status: 'coming_soon',
  },
];

export default function AIToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Tools</h1>
        <p className="mt-2 text-sm text-gray-600">
          Leverage artificial intelligence to streamline your property management workflow
        </p>
      </div>

      {/* AI Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          const isAvailable = tool.status === 'available';
          
          return (
            <Card key={tool.id} className={`hover:shadow-lg transition-all duration-200 ${
              isAvailable ? 'hover:scale-105 cursor-pointer' : 'opacity-75'
            }`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`flex-shrink-0 ${tool.color} rounded-lg p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {tool.status === 'coming_soon' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Coming Soon
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-4">
                  {tool.description}
                </p>
                {isAvailable ? (
                  <Link href={tool.href}>
                    <Button className="w-full">
                      <Bot className="h-4 w-4 mr-2" />
                      Use Tool
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full">
                    <Bot className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Featured Tool */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-lg p-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Document Parser</h3>
              <p className="text-sm text-gray-600 mt-1">
                Our most popular AI tool! Upload lease documents and automatically extract key information 
                including rent amounts, lease terms, tenant details, and more.
              </p>
              <div className="mt-3 flex items-center space-x-4">
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  95%+ Accuracy
                </div>
                <div className="flex items-center text-sm text-blue-600">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Saves 2+ hours per document
                </div>
              </div>
            </div>
            <div className="ml-4">
              <Link href="/ai/parse">
                <Button size="lg">
                  <Bot className="h-4 w-4 mr-2" />
                  Try Now
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex-shrink-0 bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">High Accuracy</h3>
            <p className="text-sm text-gray-600">
              Our AI models achieve 95%+ accuracy in document parsing and data extraction.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Time Saving</h3>
            <p className="text-sm text-gray-600">
              Reduce manual data entry time by up to 80% with automated document processing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Reduction</h3>
            <p className="text-sm text-gray-600">
              Identify potential legal risks and compliance issues before they become problems.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
