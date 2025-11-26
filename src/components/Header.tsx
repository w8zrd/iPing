import { Search, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Header = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {searchOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-md z-40 animate-fade-in"
          onClick={() => {
            setSearchOpen(false);
            setSearchQuery('');
          }}
        />
      )}
      <header className="fixed top-0 left-0 right-0 z-50 pt-safe">
        <div className="glass-strong border-b mx-4 mt-4 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            {!searchOpen ? (
              <>
                <h1 className="text-2xl font-bold text-primary">iPing</h1>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground active:text-primary"
                >
                  <Search className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground active:text-primary"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search pings, people..."
                  className="h-10 rounded-2xl glass border-border/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-apple p-3 bg-transparent focus:outline-none w-full"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-2 rounded-full ml-2 transition-colors text-muted-foreground hover:text-foreground active:text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
