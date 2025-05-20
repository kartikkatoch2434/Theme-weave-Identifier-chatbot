import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div>
      <div style={{
        background: 'red',
        color: 'white',
        padding: 32,
        textAlign: 'center',
        width: 300,
        minHeight: 100,
        zIndex: 9999,
        position: 'relative'
      }}>
        TEST SIDEBAR
      </div>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-blue-50">
        <header className="bg-white shadow-sm py-4">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-theme-blue">DocTheme Explorer</h1>
            <Link to="/dashboard">
              <Button className="bg-theme-blue hover:bg-theme-dark-blue">
                Get Started
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <section className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-5xl font-bold mb-6 text-gray-900">
              Document Research & Theme Identification Chatbot
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Analyze multiple documents, identify common themes, and get detailed, 
              cited responses to your queries all in one place.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="bg-theme-blue hover:bg-theme-dark-blue px-8 py-6 text-lg">
                Launch Dashboard
              </Button>
            </Link>
          </section>

          <section className="bg-white py-16">
            <div className="container mx-auto px-4">
              <h3 className="text-3xl font-bold mb-12 text-center text-gray-900">
                Key Features
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                  title="Document Upload & OCR" 
                  description="Upload 75+ documents in various formats. OCR technology automatically extracts text from scanned documents."
                  icon="📄"
                />
                <FeatureCard 
                  title="Theme Identification" 
                  description="Discover common themes across your documents with AI-powered analysis."
                  icon="🔍"
                />
                <FeatureCard 
                  title="Cited Responses" 
                  description="Get detailed answers with precise citations to source materials."
                  icon="📝"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-50 py-16">
            <div className="container mx-auto px-4 text-center">
              <h3 className="text-3xl font-bold mb-6 text-gray-900">
                Ready to Explore Your Documents?
              </h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Start analyzing your documents, discovering themes, and getting cited answers now.
              </p>
              <Link to="/dashboard">
                <Button size="lg" className="bg-theme-blue hover:bg-theme-dark-blue">
                  Get Started
                </Button>
              </Link>
            </div>
          </section>
        </main>

        <footer className="bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4 text-center">
            <p>© 2025 DocTheme Explorer. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h4 className="text-xl font-semibold mb-2 text-gray-900">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default Index;
