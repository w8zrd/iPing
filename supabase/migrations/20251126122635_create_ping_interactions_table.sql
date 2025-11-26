-- Create ping_interactions table
CREATE TYPE public.interaction_type AS ENUM ('LIKE', 'REPOST');

CREATE TABLE public.ping_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ping_id UUID REFERENCES public.pings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    interaction_type interaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE (ping_id, user_id, interaction_type)
);

-- Indexes for performance
CREATE INDEX ping_interactions_ping_id_idx ON public.ping_interactions (ping_id);
CREATE INDEX ping_interactions_user_id_idx ON public.ping_interactions (user_id);
CREATE INDEX ping_interactions_interaction_type_idx ON public.ping_interactions (interaction_type);


-- RLS Setup
ALTER TABLE public.ping_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all interactions
CREATE POLICY "Ping interactions are viewable by everyone"
ON public.ping_interactions FOR SELECT USING (true);

-- Users can create a new interaction (like or repost)
CREATE POLICY "Users can insert a new interaction"
ON public.ping_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interaction (unlike or unrepost)
CREATE POLICY "Users can delete their own interactions"
ON public.ping_interactions FOR DELETE USING (auth.uid() = user_id);

-- Function to safely create a ping interaction and handle uniqueness
CREATE OR REPLACE FUNCTION public.create_ping_interaction(
  p_ping_id uuid, 
  p_interaction_type public.interaction_type
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.ping_interactions (ping_id, user_id, interaction_type)
  VALUES (p_ping_id, auth.uid(), p_interaction_type)
  ON CONFLICT ON CONSTRAINT ping_interactions_ping_id_user_id_interaction_type_key DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to safely delete a ping interaction
CREATE OR REPLACE FUNCTION public.delete_ping_interaction(
  p_ping_id uuid, 
  p_interaction_type public.interaction_type
)
RETURNS void AS $$
BEGIN
  DELETE FROM public.ping_interactions
  WHERE ping_id = p_ping_id AND user_id = auth.uid() AND interaction_type = p_interaction_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Set ownership and permissions for the new functions
GRANT EXECUTE ON FUNCTION public.create_ping_interaction(uuid, public.interaction_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_ping_interaction(uuid, public.interaction_type) TO authenticated;

-- Rollback migration (DOWN)
-- DROP FUNCTION public.delete_ping_interaction(uuid, public.interaction_type);
-- DROP FUNCTION public.create_ping_interaction(uuid, public.interaction_type);
-- DROP TABLE public.ping_interactions;
-- DROP TYPE public.interaction_type;