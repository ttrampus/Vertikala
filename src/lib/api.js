import { supabase } from "@/lib/supabaseClient";

export const fetchPosts = async () => {
  const { data, error } = await supabase
    .from("BlogPost")
    .select("*")
    .eq("status", "published")
    .order("created_date", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchEvents = async () => {
  const { data, error } = await supabase
    .from("BlogPost")
    .select("*")
    .eq("status", "published")
    .eq("category", "events")
    .order("created_date", { ascending: false })
    .limit(3);

  if (error) throw error;
  return data || [];
};

export const fetchUserPosts = async (userId) => {
  const { data, error } = await supabase
    .from("BlogPost")
    .select("*")
    .eq("created_by_id", userId)
    .order("created_date", { ascending: false });

  if (error) throw error;
  return data || [];
};