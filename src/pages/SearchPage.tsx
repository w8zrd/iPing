import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in">
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users and pings..."
              className="h-14 pl-12 rounded-3xl glass-strong border-border/50 focus:border-primary transition-apple text-base"
            />
          </div>
        </div>

        <div className="space-y-4">
          {searchQuery && (
            <div className="glass rounded-3xl p-6 shadow-md animate-scale-in">
              <p className="text-muted-foreground text-center">
                Start typing to search for users and pings
              </p>
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default SearchPage;
