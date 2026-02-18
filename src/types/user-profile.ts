export interface UserProfile {
    user_view_type: string;
    name: string | null;
    company: string | null;
    blog: string | null;
    location: string | null;
    email: string | null;
    hireable: boolean | null;
    bio: string | null;
    twitter_username: string | null;
    followers: number;
    following: number;
    created_at: string;
}
