import React, { useEffect, useState } from 'react';
import PingCard from './PingCard';
import { Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import { fetchFeedPings } from '@/api/pings';
import { useAuth } from '@/providers/SupabaseAuthContext';

// Define the shape of the fetched ping data
interface Ping {
  id: string; // Use string for UUIDs
  user_id: string;
  content: string;
  created_at: string;
  image_url?: string; // Optional image URL
  profiles: {
    id: string;
    username: string;
    display_name: string;
    verified: boolean;
  };
  like_count: number;
  repost_count: number;
  is_liked: boolean;
  is_reposted: boolean;
  // views, comments, etc. can be added here
}

const Feed: React.FC = () => {
  const { user } = useAuth(); // Assuming useAuth provides current user details
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPings = async () => {
      if (!user) {
        setLoading(false);
        setError('Must be logged in to view feed.');
        return;
      }
      try {
        // Fetch pings with enriched interaction data and profiles
        const fetchedPings = await fetchFeedPings(0, 50);
        setPings(fetchedPings as unknown as Ping[]); // Cast to Ping[] since the fetch function returns a similar structure
      } catch (e) {
        logger.error('Error fetching pings for feed', e);
        setError('Failed to fetch pings for your feed.');
      } finally {
        setLoading(false);
      }
    };

    loadPings();
  }, [user]);

  if (loading) return <p>Loading feed...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {pings.length === 0 && <p className="text-center text-muted-foreground pt-4">No pings yet. Follow some users or post one!</p>}
      {pings.map((ping, index) => (
        <PingCard
          key={ping.id}
          post={
            // Map the fetched ping data to the expected PingCardProps
            {
              id: ping.id,
              content: ping.content,
              created_at: ping.created_at,
              image_url: ping.image_url,
              user_id: ping.user_id,
              profiles: ping.profiles,
              // These will be used in PingCard to initialize state, currently mocked there
              like_count: ping.like_count,
              repost_count: ping.repost_count,
              is_liked: ping.is_liked,
              is_reposted: ping.is_reposted,
            }
          }
        />
      ))}
    </div>
  );
};

export default Feed;