"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { Input } from "@ui/base";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { 
  Search, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  BookOpen,
  MessageSquare,
  Shield,
  CreditCard,
  Settings,
  Zap
} from "lucide-react";
import { toast } from "@ui/base";

// FAQ data structure
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  notHelpful: number;
}

// Sample FAQ data
const faqData: FAQItem[] = [
  {
    id: "1",
    question: "What is Authless and how does it work?",
    answer: "Authless is a self-hostable SaaS kernel that provides enterprise-grade fundamentals like authentication, multi-tenancy, i18n, notifications, support, audit, and feature flags. It's designed to let teams launch production-ready applications with just Docker Compose and a 2-minute wizard. Everything external runs through webhooks so you can wire providers in n8n without lock-in.",
    category: "General",
    tags: ["overview", "architecture", "deployment"],
    helpful: 45,
    notHelpful: 2
  },
  {
    id: "2",
    question: "How do I deploy Authless on my own infrastructure?",
    answer: "Deploying Authless is straightforward: just run 'docker compose up -d' and it will start all necessary services. The system works great on Coolify + Hetzner/OVH, and you can pair it with Cloudflare for SSL, DNS, and CDN. All external providers are configured via .env and n8n credentials.",
    category: "Deployment",
    tags: ["docker", "infrastructure", "coolify", "hetzner"],
    helpful: 38,
    notHelpful: 1
  },
  {
    id: "3",
    question: "What authentication methods does Authless support?",
    answer: "Authless supports multiple authentication methods including passwords, passkeys/WebAuthn, Google & GitHub OAuth, and two-factor authentication with TOTP/OTP + WhatsApp codes. It also supports multi-credential management, device revocation, and breach checks.",
    category: "Authentication",
    tags: ["passkeys", "oauth", "2fa", "webauthn", "totp"],
    helpful: 52,
    notHelpful: 3
  },
  {
    id: "4",
    question: "How does the multi-tenancy system work?",
    answer: "The multi-tenancy system supports tenant resolution via host/subdomain/custom domains, tenant admin console, invites, forced resets, and magic links. Each tenant can have their own feature overrides, support reasons, custom domains, and SSO setup. The system is designed to scale horizontally with proper tenant isolation.",
    category: "Multi-tenancy",
    tags: ["tenants", "domains", "isolation", "scaling"],
    helpful: 41,
    notHelpful: 2
  },
  {
    id: "5",
    question: "What is the i18n codegen feature and how does it work?",
    answer: "The i18n codegen is a CLI tool that automatically finds English strings in your code, applies t() wrappers, generates stable IDs, and patches language files as deltas. It includes one-click LLM fill for missing keys with caching, and developers can approve diffs locally. This makes internationalization much easier to implement and maintain.",
    category: "Internationalization",
    tags: ["i18n", "localization", "codegen", "cli", "llm"],
    helpful: 29,
    notHelpful: 1
  },
  {
    id: "6",
    question: "How do notifications work in Authless?",
    answer: "Notifications in Authless include real-time messaging via self-hosted Centrifugo, in-app tray + page, digests, and email/WhatsApp via n8n webhooks. You can target specific users, roles, entire tenants, or the whole platform with user opt-in preferences. All external communications go through webhooks for flexibility.",
    category: "Notifications",
    tags: ["real-time", "centrifugo", "webhooks", "n8n", "email"],
    helpful: 34,
    notHelpful: 2
  },
  {
    id: "7",
    question: "What support features are available?",
    answer: "Authless includes a user-facing support form with reason-based routing (global + tenant-level rules), outbound communication via webhooks→n8n→Mailgun, and inbound Mailgun replies threaded back into the app. It supports SLAs, escalation hooks, admin deletion, and comprehensive audit logging.",
    category: "Support",
    tags: ["support", "routing", "mailgun", "sla", "audit"],
    helpful: 31,
    notHelpful: 1
  },
  {
    id: "8",
    question: "How do feature toggles work?",
    answer: "Feature toggles support global (platform) and tenant overrides with tiers: Core, Secondary, and Tenancy-only. The system uses simple precedence (tenant > global > default) with cache + pub/sub invalidation and audit logging. This allows for flexible feature management across different tenant tiers.",
    category: "Feature Flags",
    tags: ["feature-flags", "toggles", "tiers", "caching", "audit"],
    helpful: 27,
    notHelpful: 1
  },
  {
    id: "9",
    question: "What is the pricing model for Authless?",
    answer: "Authless offers a Free (Maker) tier with full core kernel and community support, Commercial (Per-product) at £399 one-time with 12 months updates + priority support, Agency/Studio at £999/year with unlimited client projects, and Enterprise with custom annual pricing for SLAs and compliance. There's also a Founding Cohort special at £299 one-time.",
    category: "Pricing",
    tags: ["pricing", "licensing", "tiers", "commercial", "enterprise"],
    helpful: 48,
    notHelpful: 3
  },
  {
    id: "10",
    question: "How do I integrate external services with Authless?",
    answer: "External services integrate through webhooks everywhere with HMAC verification for safe n8n integrations. The system supports dead-letter + replay mechanisms and integrates with providers like MinIO/S3 for object storage, Mailgun for email, and various SMS/WhatsApp providers through n8n orchestration.",
    category: "Integration",
    tags: ["webhooks", "n8n", "minio", "mailgun", "integrations"],
    helpful: 36,
    notHelpful: 2
  },
  {
    id: "11",
    question: "What are the system requirements for running Authless?",
    answer: "Authless requires Docker and Docker Compose, PostgreSQL 14+, and at least 2GB RAM. The system works on Linux, macOS, and Windows. For production, we recommend 4GB+ RAM, SSD storage, and a modern CPU. All dependencies are containerized, making deployment consistent across environments.",
    category: "Deployment",
    tags: ["requirements", "docker", "postgresql", "system", "hardware"],
    helpful: 28,
    notHelpful: 1
  },
  {
    id: "12",
    question: "How do I customize the Authless theme and branding?",
    answer: "Authless supports theme customization through CSS variables and component overrides. You can customize colors, fonts, logos, and branding elements. The system includes a theme builder in the admin panel, and you can also create custom CSS files for advanced styling. All changes are applied globally or per-tenant.",
    category: "Customization",
    tags: ["theme", "branding", "css", "customization", "styling"],
    helpful: 22,
    notHelpful: 1
  }
];

// Enhanced embedding function using word frequency and semantic weighting
function createEmbedding(text: string): number[] {
  // Convert to lowercase and split into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  // Filter out stop words and create frequency map
  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // Apply TF-IDF-like weighting (simplified)
  const totalWords = words.length;
  Object.keys(wordFreq).forEach(word => {
    const tf = wordFreq[word] / totalWords;
    wordFreq[word] = tf * Math.log(1 + tf);
  });
  
  // Convert to normalized vector
  const values = Object.values(wordFreq);
  const magnitude = Math.sqrt(values.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? values.map(val => val / magnitude) : values;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Pre-compute embeddings for FAQ items
const faqEmbeddings = faqData.map(item => ({
  ...item,
  embedding: createEmbedding(item.question + ' ' + item.answer + ' ' + item.tags.join(' '))
}));

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<typeof faqData>(faqData);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search for answers..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ["All", ...Array.from(new Set(faqData.map(item => item.category)))];
    return cats;
  }, []);

  // Enhanced search function using embeddings and text matching
  const performSearch = useMemo(() => {
    return (query: string, category: string) => {
      if (!query.trim()) {
        return faqData.filter(item => category === "All" || item.category === category);
      }

      const queryEmbedding = createEmbedding(query);
      const queryLower = query.toLowerCase();
      
      // Calculate similarities and sort by relevance
      const results = faqEmbeddings
        .filter(item => category === "All" || item.category === category)
        .map(item => {
          const embeddingSimilarity = cosineSimilarity(queryEmbedding, item.embedding);
          
          // Boost score for exact text matches
          let textBoost = 0;
          if (item.question.toLowerCase().includes(queryLower)) textBoost += 0.3;
          if (item.answer.toLowerCase().includes(queryLower)) textBoost += 0.2;
          if (item.tags.some(tag => tag.toLowerCase().includes(queryLower))) textBoost += 0.1;
          
          // Combine embedding similarity with text boost
          const finalScore = Math.min(1, embeddingSimilarity + textBoost);
          
          return {
            ...item,
            similarity: finalScore
          };
        })
        .filter(item => item.similarity > 0.15) // Slightly higher threshold for better quality
        .sort((a, b) => b.similarity - a.similarity)
        .map(({ similarity, ...item }) => item);

      return results;
    };
  }, []);

  // Update search results when query or category changes
  useEffect(() => {
    const results = performSearch(searchQuery, selectedCategory);
    setSearchResults(results);
    
    // Add to recent searches if query is meaningful
    if (searchQuery.trim() && searchQuery.length > 2) {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s !== searchQuery.trim());
        return [searchQuery.trim(), ...filtered].slice(0, 5);
      });
      
      // Track search analytics
      trackSearch(searchQuery.trim());
    }
  }, [searchQuery, selectedCategory, performSearch]);

  // Toggle expanded state for FAQ items
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Handle helpful/not helpful feedback
  const handleFeedback = (id: string, type: 'helpful' | 'notHelpful') => {
    toast.success(`Thank you for your feedback!`);
    // In a real app, this would send to the server
  };

  // Track search analytics
  const trackSearch = (query: string) => {
    // In a real app, this would send analytics to the server
    console.log(`Search tracked: ${query}`);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "General": return <HelpCircle className="h-4 w-4" />;
      case "Deployment": return <Zap className="h-4 w-4" />;
      case "Authentication": return <Shield className="h-4 w-4" />;
      case "Multi-tenancy": return <Settings className="h-4 w-4" />;
      case "Internationalization": return <BookOpen className="h-4 w-4" />;
      case "Notifications": return <MessageSquare className="h-4 w-4" />;
      case "Support": return <MessageSquare className="h-4 w-4" />;
      case "Feature Flags": return <Zap className="h-4 w-4" />;
      case "Pricing": return <CreditCard className="h-4 w-4" />;
      case "Integration": return <Settings className="h-4 w-4" />;
      case "Customization": return <Settings className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  return (
    <main className="flex flex-1 pt-8 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about Authless. Can't find what you're looking for? 
            <a href="/contact" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
              Contact our support team
            </a>
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for answers... (⌘K)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            
            {/* Clear Search Button */}
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
            
            {/* Search Suggestions */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-sm text-gray-500 mb-2">Recent searches:</div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search) => (
                        <button
                          key={search}
                          onClick={() => {
                            setSearchQuery(search);
                            setShowSuggestions(false);
                          }}
                          className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Popular searches */}
                <div className="p-3 border-b border-gray-100">
                  <div className="text-sm text-gray-500 mb-2">Popular searches:</div>
                  <div className="flex flex-wrap gap-2">
                    {['deployment', 'authentication', 'multi-tenancy', 'pricing', 'webhooks'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Quick category suggestions */}
                <div className="p-3">
                  <div className="text-sm text-gray-500 mb-2">Browse by category:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.filter(cat => cat !== "All").slice(0, 6).map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowSuggestions(false);
                        }}
                        className="text-left p-2 text-sm hover:bg-gray-50 rounded transition-colors"
                      >
                        {getCategoryIcon(category)}
                        <span className="ml-2">{category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="flex items-center gap-2"
              >
                {getCategoryIcon(category)}
                {category}
              </Button>
            ))}
          </div>

          {/* Results Count */}
          <div className="text-center">
            <div className="text-gray-600 mb-2">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
              {searchQuery && ` for "${searchQuery}"`}
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
            </div>
            
            {/* Search Tips */}
            {searchQuery && searchResults.length > 0 && (
              <div className="text-sm text-gray-500">
                💡 Tip: Use specific keywords like "deployment", "authentication", or "pricing" for better results
              </div>
            )}
          </div>
        </div>

        {/* FAQ Results */}
        <div className="space-y-4">
          {searchResults.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? `No results found for "${searchQuery}"` : "No results found"}
                </p>
                
                {/* Helpful suggestions */}
                <div className="max-w-md mx-auto mb-6">
                  <div className="text-sm text-gray-500 mb-3">Try these suggestions:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['deployment', 'authentication', 'multi-tenancy', 'pricing'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setSearchQuery(suggestion)}
                        className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                    className="mr-2"
                  >
                    Clear Search
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCategory("All")}
                  >
                    Browse All Categories
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            searchResults.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader 
                  className="cursor-pointer pb-3"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {searchQuery ? (
                          <span dangerouslySetInnerHTML={{
                            __html: item.question.replace(
                              new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                            )
                          }} />
                        ) : (
                          item.question
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        <div className="flex gap-1">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {expandedItems.has(item.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {expandedItems.has(item.id) && (
                  <CardContent className="pt-0">
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {item.answer}
                      </p>
                    </div>
                    
                    {/* Feedback Section */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Was this helpful?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(item.id, 'helpful')}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          👍 Yes ({item.helpful})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(item.id, 'notHelpful')}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          👎 No ({item.notHelpful})
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Last updated: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Contact Support CTA */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Still need help?
              </h3>
              <p className="text-gray-600 mb-4">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <Button asChild size="lg">
                <a href="/contact">
                  Contact Support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
