import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useDeferredValue } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  MessageCircle, Heart, Trash2, Send, Image as ImageIcon,
  X, ChevronDown, ChevronUp, CornerDownRight, Bookmark,
  Search, Share2, Sparkles, Filter, User, Plus, Pencil
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendMentionNotifications } from "@/lib/mentions";
import { toast } from "sonner";
import { MembersSidebar } from "@/components/members/MembersSidebar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { notifyUser } from "@/lib/notify";
import { useSavedPosts, useToggleSave } from "@/hooks/use-saved-posts";
import { useAddXp, getLevel, useXp } from "@/hooks/use-xp";
import { useAdmin } from "@/hooks/use-admin";


export const Route = createFileRoute("/_app/community")({
  component: CommunityPage,
  head: () => ({ meta: [{ title: "Comunidade — Membros" }] }),
});

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null; instagram: string | null; xp?: number | null } | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null; instagram: string | null; xp?: number | null } | null;
  likes: number;
  liked: boolean;
  comments: Comment[];
  commentCount: number;
};

const MAX = 2000;
const db = supabase as any;

const formatRelativeTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
};

function CommunityPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Controle de busca e abas
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [activeTab, setActiveTab] = useState<"all" | "my" | "saved">("all");
  const [limit, setLimit] = useState(10);

  // --- STORIES 24H CONFIGS & STATES ---
  type Story = {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    gradient: string;
    content: string;
    image_url?: string | null;
    date: string;
    viewed?: boolean;
  };

  const [stories, setStories] = useState<Story[]>([]);
  const [storyImageFile, setStoryImageFile] = useState<File | null>(null);
  const [storyImagePreview, setStoryImagePreview] = useState<string | null>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);

  // Load stories from Supabase (within 24 hours)
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data, error } = await supabase
          .from("community_stories")
          .select("*")
          .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch viewed stories from localStorage
        let viewedIds: string[] = [];
        try {
          const rawViewed = localStorage.getItem("nebula_viewed_story_ids");
          if (rawViewed) viewedIds = JSON.parse(rawViewed) as string[];
        } catch (_) {}

        const DEFAULT_STORIES: Story[] = [
          {
            id: "st-1",
            userId: "default",
            userName: "Thiago Mentor",
            userAvatar: "TM",
            gradient: "from-purple-600 via-pink-600 to-amber-500",
            content: "Bati R$ 15k de faturamento hoje no dropshipping com o novo funil de conversão rápida! O ROAS disparou para 5.4x! 📈🚀",
            date: "há 2 horas",
            viewed: viewedIds.includes("st-1")
          },
          {
            id: "st-2",
            userId: "default",
            userName: "Carol Estrategista",
            userAvatar: "CE",
            gradient: "from-blue-600 to-violet-600",
            content: "Dica de ouro para anúncios de tráfego: comecem com criativos focados na dor principal do cliente nos primeiros 3 segundos! A CTR média subiu para 3.8% nos testes. 🎯",
            date: "há 5 horas",
            viewed: viewedIds.includes("st-2")
          },
          {
            id: "st-3",
            userId: "default",
            userName: "Felipe Designer",
            userAvatar: "FD",
            gradient: "from-cyan-500 to-emerald-500",
            content: "Nova identidade visual da área premium aprovada! A experiência gamificada vai contar com conquistas ainda mais imersivas. 🔥",
            date: "há 8 horas",
            viewed: viewedIds.includes("st-3")
          },
          {
            id: "st-4",
            userId: "default",
            userName: "Marina Copy",
            userAvatar: "MC",
            gradient: "from-orange-500 to-rose-500",
            content: "Headline matadora validada na página de vendas do infoproduto. A taxa de conversão no checkout pulou de 1.2% para 2.45%! 📝💡",
            date: "há 10 horas",
            viewed: viewedIds.includes("st-4")
          }
        ];

        const mappedDbStories = (data || []).map((s) => ({
          id: s.id,
          userId: s.user_id,
          userName: s.user_name,
          userAvatar: s.user_avatar,
          gradient: s.gradient,
          content: s.content,
          image_url: s.image_url,
          date: formatRelativeTime(s.created_at),
          viewed: viewedIds.includes(s.id)
        }));

        setStories([...mappedDbStories, ...DEFAULT_STORIES]);
      } catch (err) {
        console.error("Error fetching community stories:", err);
      }
    };

    fetchStories();
  }, []);

  // Automatic background cleanup of expired stories (> 24 hours old) to optimize database and storage usage
  useEffect(() => {
    if (!user) return;
    const cleanupExpired = async () => {
      try {
        const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Find stories older than 24h
        let query = supabase
          .from("community_stories")
          .select("id, image_url, user_id")
          .lt("created_at", threshold);
        
        // Non-admins can only delete their own stories. Let's fetch all expired ones that are owned by the user (or all if admin)
        if (!isAdmin) {
          query = query.eq("user_id", user.id);
        }
        
        const { data: expiredStories, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        if (expiredStories && expiredStories.length > 0) {
          console.log(`[Stories Cleanup] Found ${expiredStories.length} expired stories. Cleaning up...`);
          
          for (const story of expiredStories) {
            // Delete from database
            const { error: delDbErr } = await supabase
              .from("community_stories")
              .delete()
              .eq("id", story.id);
              
            if (delDbErr) {
              console.error(`[Stories Cleanup] Error deleting story database record ${story.id}:`, delDbErr);
              continue;
            }

            // Delete associated storage image if exists
            if (story.image_url) {
              try {
                const pathParts = story.image_url.split("/storage/v1/object/public/community/");
                if (pathParts.length > 1) {
                  const storagePath = pathParts[1];
                  const { error: delStorageErr } = await supabase.storage
                    .from("community")
                    .remove([storagePath]);
                    
                  if (delStorageErr) {
                    console.error(`[Stories Cleanup] Error removing storage object ${storagePath}:`, delStorageErr);
                  } else {
                    console.log(`[Stories Cleanup] Successfully removed storage object ${storagePath}`);
                  }
                }
              } catch (storageErr) {
                console.error("[Stories Cleanup] Error extracting or deleting storage file:", storageErr);
              }
            }
          }
        }
      } catch (err) {
        console.error("[Stories Cleanup] Background story cleanup failed:", err);
      }
    };

    // Run cleanup after 3 seconds to not block page loading initial layout
    const timer = setTimeout(cleanupExpired, 3000);
    return () => clearTimeout(timer);
  }, [user, isAdmin]);

  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB.");
        return;
      }
      setStoryImageFile(file);
      if (storyImagePreview) URL.revokeObjectURL(storyImagePreview);
      setStoryImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveStoryImage = () => {
    setStoryImageFile(null);
    if (storyImagePreview) URL.revokeObjectURL(storyImagePreview);
    setStoryImagePreview(null);
    if (storyFileRef.current) storyFileRef.current.value = "";
  };

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [newStoryText, setNewStoryText] = useState("");
  const [newStoryGrad, setNewStoryGrad] = useState("from-purple-600 via-pink-600 to-amber-500");
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Reset story progress on active story change
  useEffect(() => {
    setStoryProgress(0);
  }, [activeStoryIndex]);

  // Stories auto-advance with gesture pause support
  useEffect(() => {
    if (activeStoryIndex === null) return;
    if (isStoryPaused) return;

    const interval = setInterval(() => {
      setStoryProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
          } else {
            setActiveStoryIndex(null);
          }
          return 0;
        }
        return p + 1;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [activeStoryIndex, isStoryPaused, stories.length]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryText.trim() && !storyImageFile) {
      toast.error("Por favor, digite uma mensagem ou selecione uma imagem.");
      return;
    }
    if (!user) return;

    const uName = myProfile?.full_name || "Membro Star";
    const uAvatar = (myProfile?.full_name || "MS")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    try {
      let image_url: string | null = null;
      if (storyImageFile) {
        const ext = storyImageFile.name.split(".").pop() ?? "jpg";
        const path = `stories/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, storyImageFile);
        if (upErr) throw upErr;
        
        const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("community_stories")
        .insert({
          user_id: user.id,
          user_name: uName,
          user_avatar: uAvatar,
          gradient: newStoryGrad,
          content: newStoryText.trim(),
          image_url: image_url
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newStory: Story = {
          id: data.id,
          userId: data.user_id,
          userName: data.user_name,
          userAvatar: data.user_avatar,
          gradient: data.gradient,
          content: data.content,
          image_url: data.image_url,
          date: "agora mesmo",
          viewed: false
        };

        setStories((prev) => [newStory, ...prev]);
        toast.success("Story operacional publicado!");
        (window as any).sendNebulaNotification?.("Novo Story Publicado! 📱", "Seu story operacional já está disponível no topo do feed da comunidade.");
      }
    } catch (err: any) {
      console.error("Error creating community story:", err);
      toast.error(`Falha ao publicar story: ${err.message || err.error_description || "Erro de rede ou banco"}`);
    } finally {
      setNewStoryText("");
      handleRemoveStoryImage();
      setIsCreatingStory(false);
    }
  };

  const { data: savedPosts = [] } = useSavedPosts();
  const toggleSave = useToggleSave();
  const addXp = useAddXp();
  const { data: myXp = 0 } = useXp();

  // Query para perfil do próprio usuário (para o avatar do composer)
  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, instagram, plan")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("community-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "posts" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "comments" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "post_likes" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<Post[]> => {
      const [pRes, lRes, cRes, profRes] = await Promise.all([
        db.from("posts").select("*").order("created_at", { ascending: false }).limit(limit),
        db.from("post_likes").select("post_id, user_id"),
        db.from("comments").select("*").order("created_at", { ascending: true }),
        db.from("profiles").select("id, full_name, avatar_url, instagram, xp"),
      ]);
      if (pRes.error) throw pRes.error;
      const profs = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
      const likes = lRes.data ?? [];
      const comments = (cRes.data ?? []).map((c: any) => ({
        ...c,
        author: profs.get(c.user_id) ?? null,
      }));
      return (pRes.data ?? []).map((p: any) => {
        const postComments = comments.filter((c: any) => c.post_id === p.id);
        return {
          ...p,
          author: profs.get(p.user_id) ?? null,
          likes: likes.filter((l: any) => l.post_id === p.id).length,
          liked: likes.some((l: any) => l.post_id === p.id && l.user_id === user!.id),
          comments: postComments,
          commentCount: postComments.length,
        };
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content && !imageFile) return;
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const { error } = await db.from("posts").insert({
        user_id: user!.id,
        content: content || null,
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      sendMentionNotifications(text, myProfile?.full_name || "Alguém", "Comunidade");
      setText(""); 
      removeImage(); 
      qc.invalidateQueries({ queryKey: ["posts"] }); 
      toast.success("Publicado na comunidade!"); 
      (window as any).sendNebulaNotification?.("Publicação Concluída! 🚀", "Seu novo post foi enviado para o feed de insights da comunidade.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        await db.from("post_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await db.from("post_likes").insert({ post_id: postId, user_id: user!.id });
        const post = posts.find((p) => p.id === postId);
        if (post) {
          const actorName = (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Alguém";
          notifyUser({ recipientId: post.user_id, actorId: user!.id, title: "Nova curtida no seu post", content: `${actorName} curtiu seu post na comunidade` });
        }
        addXp.mutate("like");
      }
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const prev = qc.getQueryData<Post[]>(["posts", user?.id, limit]);
      qc.setQueryData<Post[]>(["posts", user?.id, limit], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) } : p))
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => ctx?.prev && qc.setQueryData(["posts", user?.id, limit], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await db.from("posts").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const edit = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await db.from("posts").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Publicação atualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const initials = ((user?.user_metadata as any)?.full_name || user?.email || "M").slice(0, 2).toUpperCase();
  const remaining = MAX - text.length;

  // Filtragem de Posts reativa
  const filteredPosts = posts.filter((p) => {
    // 1. Filtragem por Aba
    if (activeTab === "my" && p.user_id !== user?.id) return false;
    if (activeTab === "saved" && !savedPosts.some((s) => s.post_id === p.id)) return false;

    // 2. Filtragem por Pesquisa
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      const contentMatch = p.content?.toLowerCase().includes(q);
      const authorMatch = p.author?.full_name?.toLowerCase().includes(q);
      return contentMatch || authorMatch;
    }

    return true;
  });

  return (
    <div className="flex justify-center gap-6 max-w-7xl mx-auto px-4">
      {/* Coluna Esquerda: Perfil & XP */}
      <div className="hidden lg:block w-64 shrink-0">
        <ProfileSidebarWidget />
      </div>

      {/* Coluna Central: Feed */}
      <div className="flex-1 max-w-2xl space-y-5 py-2 min-w-0">
        {/* Header da Comunidade */}
        <div className="space-y-4 pb-2 animate-fade-up">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shadow-[0_2px_12px_rgba(var(--primary),0.05)]">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>{posts.length} publicações na rede</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-foreground/90 to-white/60 bg-clip-text text-transparent">Comunidade Nebula</h1>
            <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">Compartilhe insights, conecte-se com membros e ganhe XP participando.</p>
          </div>

          {/* Barra de Pesquisa & Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Campo de Pesquisa */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/45 transition-colors group-hover:text-primary group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Pesquisar publicações ou membros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:bg-white/[0.04] focus:shadow-glow transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/5 text-muted-foreground/50 hover:text-foreground transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Abas do Feed */}
            <div className="flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                Geral
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  activeTab === "my"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <User className="h-3 w-3" />
                Meus Posts
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  activeTab === "saved"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Bookmark className="h-3 w-3" />
                Salvos
              </button>
            </div>
          </div>
        </div>

        {/* Composer (Novo Post) */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] backdrop-blur-md overflow-hidden transition-all duration-300 focus-within:border-primary/40 focus-within:shadow-glow focus-within:bg-white/[0.03] animate-fade-up">
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar initials={initials} xp={myXp} avatarUrl={myProfile?.avatar_url} />
              <span className="text-sm font-semibold text-foreground/80">Nova publicação</span>
            </div>
            <RichTextEditor
              content={text}
              onChange={(html) => setText(html.slice(0, MAX))}
              placeholder="O que está pensando hoje para compartilhar?"
              minHeight="80px"
            />
          </div>

          {imagePreview && (
            <div className="relative mx-5 mb-3 rounded-xl overflow-hidden border border-white/10 max-h-56 animate-fade-up">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover max-h-56" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition shadow-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
            <div className="flex gap-1 text-muted-foreground">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageSelect} />
              <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-xl hover:bg-white/5 hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95" title="Adicionar Imagem">
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-mono tabular-nums ${remaining < 100 ? "text-amber-400 font-bold" : "text-muted-foreground/45"}`}>{remaining}</span>
              <button
                onClick={() => create.mutate()}
                disabled={(!text.trim() && !imageFile) || create.isPending}
                className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-40 transition-all hover:scale-102 hover:brightness-105 shadow-[0_4px_16px_-4px_oklch(0.65_0.22_290/0.5)] active:scale-98"
              >
                <Send className="h-3.5 w-3.5" />
                {create.isPending ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>

        {/* Stories Operacionais Rápidos (Feature 5) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.015] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Stories Operacionais (24h)
            </span>
            <span className="text-[9px] text-muted-foreground/45 font-semibold">Poste faturamentos ou insights</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1.5 select-none touch-pan-x">
            {/* Novo Story Button */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreatingStory(true)}
                className="h-14 w-14 rounded-full border border-dashed border-white/20 hover:border-primary/50 bg-white/[0.02] flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative group"
              >
                <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus className="h-5 w-5" />
              </button>
              <span className="text-[9px] text-muted-foreground font-medium">Novo Story</span>
            </div>

            {/* Stories List */}
            {stories.map((st, idx) => (
              <div key={st.id} className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStoryIndex(idx);
                    setStoryProgress(0);
                    const clickedStory = stories[idx];
                    const updated = stories.map((s, i) => i === idx ? { ...s, viewed: true } : s);
                    setStories(updated);
                    
                    // Track viewed story IDs in localStorage
                    try {
                      const rawViewed = localStorage.getItem("nebula_viewed_story_ids") || "[]";
                      const viewedIds = JSON.parse(rawViewed) as string[];
                      if (!viewedIds.includes(clickedStory.id)) {
                        viewedIds.push(clickedStory.id);
                        localStorage.setItem("nebula_viewed_story_ids", JSON.stringify(viewedIds));
                      }
                    } catch (_) {}
                  }}
                  className={`h-14 w-14 rounded-full p-[2.5px] bg-gradient-to-tr transition-all duration-300 hover:scale-105 cursor-pointer active:scale-95 ${
                    st.viewed 
                      ? "from-white/10 to-white/5 border border-white/5 shadow-inner" 
                      : "from-primary via-pink-500 to-amber-400 p-[3px] shadow-[0_0_12px_rgba(167,139,250,0.25)] animate-pulse"
                  }`}
                >
                  <div className="h-full w-full rounded-full bg-[#0c0c0e] flex items-center justify-center border border-black/40 overflow-hidden relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${st.gradient} opacity-20`} />
                    <span className="text-xs font-black text-foreground relative z-10 tracking-tight">{st.userAvatar}</span>
                  </div>
                </button>
                <span className="text-[9px] text-muted-foreground/80 font-semibold max-w-[65px] truncate">{st.userName.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          {/* Visualizador de Story Overlay */}
          {activeStoryIndex !== null && (() => {
            const activeStory = stories[activeStoryIndex];
            if (!activeStory) return null;
            return (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fade-in" 
                onClick={() => setActiveStoryIndex(null)}
              >
                <div 
                  className={`relative w-full h-full md:h-[92vh] md:max-w-lg md:aspect-[9/16] md:border md:border-white/10 md:rounded-[32px] overflow-hidden shadow-[0_0_80px_-10px_rgba(139,92,246,0.25)] flex flex-col justify-between p-6 transition-all duration-300 ${
                    activeStory.image_url ? "" : `bg-gradient-to-br ${activeStory.gradient}`
                  }`}
                  style={
                    activeStory.image_url 
                      ? { backgroundImage: `url(${activeStory.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={() => setIsStoryPaused(true)}
                  onMouseUp={() => setIsStoryPaused(false)}
                  onMouseLeave={() => setIsStoryPaused(false)}
                  onTouchStart={() => setIsStoryPaused(true)}
                  onTouchEnd={() => setIsStoryPaused(false)}
                >
                  {/* Subtle dark gradient overlay for image legibility */}
                  {activeStory.image_url && (
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/85 z-0 pointer-events-none" />
                  )}
                  
                  {/* Progress Bar Indicators */}
                  <div className="flex gap-1.5 w-full absolute top-4 left-0 px-4 z-20">
                    {stories.map((_, i) => {
                      let widthVal = 0;
                      if (i < activeStoryIndex) widthVal = 100;
                      else if (i === activeStoryIndex) widthVal = storyProgress;
                      return (
                        <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white transition-all duration-[40ms] ease-linear" style={{ width: `${widthVal}%` }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Story Header */}
                  <div className="flex items-center justify-between mt-3 z-10">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${activeStory.gradient} flex items-center justify-center font-bold text-xs border border-white/15 shadow-md text-white select-none`}>
                        {activeStory.userAvatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white drop-shadow-md select-none">{activeStory.userName}</div>
                        <div className="text-[10px] text-white/70 drop-shadow select-none">{activeStory.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(activeStory.userId === user?.id || isAdmin) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirm({ title: "Apagar story?", confirmLabel: "Apagar" })) {
                              try {
                                const { error: dbErr } = await supabase
                                  .from("community_stories")
                                  .delete()
                                  .eq("id", activeStory.id);
                                if (dbErr) throw dbErr;

                                if (activeStory.image_url) {
                                  try {
                                    const pathParts = activeStory.image_url.split("/storage/v1/object/public/community/");
                                    if (pathParts.length > 1) {
                                      const storagePath = pathParts[1];
                                      const { error: delStorageErr } = await supabase.storage
                                        .from("community")
                                        .remove([storagePath]);
                                      if (delStorageErr) throw delStorageErr;
                                    }
                                  } catch (storageErr) {
                                    console.error("Error removing story storage file:", storageErr);
                                  }
                                }
                                
                                toast.success("Story operacional excluído!");
                                setStories((prev) => prev.filter((s) => s.id !== activeStory.id));
                                setActiveStoryIndex(null);
                              } catch (err: any) {
                                toast.error(`Erro ao excluir story: ${err.message || "Erro desconhecido"}`);
                              }
                            }
                          }}
                          className="p-1.5 rounded-full hover:bg-red-500/20 text-white/80 hover:text-red-400 transition cursor-pointer"
                          title="Excluir Story"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveStoryIndex(null)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tap Left / Right Areas for navigation */}
                  <div className="absolute inset-x-0 top-16 bottom-24 flex z-10 pointer-events-auto">
                    <div 
                      className="w-1/4 h-full cursor-w-resize" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeStoryIndex > 0) setActiveStoryIndex(activeStoryIndex - 1);
                        else setActiveStoryIndex(null);
                      }}
                    />
                    <div className="w-2/4 h-full" />
                    <div 
                      className="w-1/4 h-full cursor-e-resize" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeStoryIndex < stories.length - 1) setActiveStoryIndex(activeStoryIndex + 1);
                        else setActiveStoryIndex(null);
                      }}
                    />
                  </div>

                  {/* Story Text Content with Glowing Premium Design */}
                  <div className="flex-1 flex items-center justify-center p-4 z-10 select-none">
                    {activeStory.image_url ? (
                      <div className="bg-black/35 backdrop-blur-lg px-5 py-4 rounded-3xl border border-white/10 shadow-2xl text-left w-full max-w-[92%] mx-auto mt-auto mb-12 select-none animate-fade-up">
                        <p className="text-[13px] font-medium leading-relaxed tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                          {activeStory.content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xl sm:text-2xl font-black text-white px-6 select-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] tracking-tight leading-relaxed max-w-sm mx-auto text-center duration-300 transform scale-102">
                        {activeStory.content}
                      </p>
                    )}
                  </div>

                  {/* Quick Footer Action */}
                  <div className="text-center text-[10px] text-white/55 z-10 flex justify-center items-center gap-1.5 pb-1 select-none pointer-events-none">
                    <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                    <span>Segure para pausar · Toque nas laterais para navegar</span>
                  </div>

                </div>
              </div>
            );
          })()}
        </div>

        {/* Story Creator Overlay */}
        {isCreatingStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setIsCreatingStory(false)}>
            <form onSubmit={handleCreateStory} className="w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Plus className="h-4 w-4 text-primary" /> Publicar Story Operacional
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingStory(false)}
                  className="p-1 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Qual é o seu faturamento ou dica de hoje?</span>
                  <textarea
                    maxLength={160}
                    placeholder="Ex: Novo recorde! R$ 4.2k faturados hoje de manhã no tráfego direto! 📈🔥"
                    value={newStoryText}
                    onChange={(e) => setNewStoryText(e.target.value)}
                    className="w-full h-24 bg-white/[0.02] border border-white/10 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/50 transition-all resize-none bg-background"
                  />
                  <span className="text-[9px] text-muted-foreground/40 block text-right mt-0.5">{160 - newStoryText.length} caracteres restantes</span>
                </div>

                {/* Upload de Imagem */}
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    Adicionar Imagem (Opcional)
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      ref={storyFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleStoryImageChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => storyFileRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-foreground hover:bg-white/10 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                      <span>{storyImageFile ? "Alterar Imagem" : "Escolher Imagem"}</span>
                    </button>
                    {storyImageFile && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px] font-mono">
                          {storyImageFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveStoryImage}
                          className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition cursor-pointer"
                          title="Remover imagem"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Escolha a cor do seu Story</span>
                  <div className="flex gap-2">
                    {[
                      { id: "from-purple-600 via-pink-600 to-amber-500", label: "Magma" },
                      { id: "from-blue-600 to-indigo-600", label: "Estelar" },
                      { id: "from-cyan-500 to-emerald-500", label: "Esmeralda" },
                      { id: "from-orange-500 to-rose-500", label: "Crepúsculo" },
                      { id: "from-[#0f0c29] via-[#302b63] to-[#24243e]", label: "Nebulosa" }
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setNewStoryGrad(g.id)}
                        className={`flex-1 h-8 rounded-lg bg-gradient-to-br ${g.id} border hover:scale-105 active:scale-95 transition-all text-[8px] font-black text-white flex items-center justify-center select-none cursor-pointer ${
                          newStoryGrad === g.id ? "border-white scale-102 ring-2 ring-primary/20 shadow-md" : "border-white/10 hover:border-white/30"
                        }`}
                        title={g.label}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Story */}
              <div className="pt-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Prévia do Layout</span>
                <div 
                  className={`w-full aspect-[16/9] rounded-xl p-4 flex items-center justify-center text-center border border-white/10 shadow relative overflow-hidden ${
                    storyImagePreview ? "" : `bg-gradient-to-br ${newStoryGrad}`
                  }`}
                  style={
                    storyImagePreview 
                      ? { backgroundImage: `url(${storyImagePreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                >
                  {storyImagePreview && (
                    <div className="absolute inset-0 bg-black/45 z-0" />
                  )}
                  <p className="text-[10px] font-black text-white max-w-[200px] leading-relaxed select-none drop-shadow relative z-10">
                    "{newStoryText.trim() || (storyImagePreview ? "Adicione um texto (opcional)" : "Digite um texto acima...")}"
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl gradient-primary text-white text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Publicar Story no Mural
              </button>
            </form>
          </div>
        )}

        {/* Feed de Publicações */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-16 text-center animate-fade-up">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" strokeWidth={1.2} />
            <div className="text-sm font-semibold">Nenhuma publicação encontrada</div>
            <p className="text-xs text-muted-foreground/70 mt-1">Experimente mudar o filtro ou fazer outra busca.</p>
          </div>
        ) : (
          <div className="space-y-4 stagger-enter">
            {filteredPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                userId={user!.id}
                saved={savedPosts.some((s) => s.post_id === p.id)}
                onLike={() => toggleLike.mutate({ postId: p.id, liked: p.liked })}
                onDelete={async () => { if (await confirm({ title: "Apagar publicação?", description: "Esta ação não pode ser desfeita.", confirmLabel: "Apagar" })) remove.mutate(p.id); }}
                onSave={() => toggleSave.mutate({ postId: p.id, postType: "community", saved: savedPosts.some((s) => s.post_id === p.id) })}
                onEdit={async (id, content) => { await edit.mutateAsync({ id, content }); }}
              />
            ))}
            {filteredPosts.length >= limit && (
              <div className="pt-4 flex justify-center pb-8 animate-fade-up">
                <button
                  onClick={() => setLimit((l) => l + 10)}
                  className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/30 text-xs font-bold text-foreground transition-all duration-300 hover:scale-102 cursor-pointer shadow-md"
                >
                  Carregar mais publicações ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <MembersSidebar />
      {confirmDialog}
    </div>
  );
}

/* ─── ProfileSidebarWidget ─── */

function ProfileSidebarWidget() {
  const { user } = useAuth();
  const { data: xp = 0 } = useXp();

  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, instagram, plan")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const name = myProfile?.full_name || user?.user_metadata?.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();
  const levelInfo = getLevel(xp);

  const getRankColor = (lvl: number) => {
    if (lvl >= 8) return "from-amber-400 to-yellow-300 text-yellow-950 ring-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.4)]";
    if (lvl >= 7) return "from-fuchsia-500 to-purple-600 text-white ring-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.4)]";
    if (lvl >= 6) return "from-indigo-500 to-violet-600 text-white ring-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.4)]";
    if (lvl >= 5) return "from-blue-500 to-cyan-400 text-white ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]";
    if (lvl >= 4) return "from-teal-500 to-emerald-400 text-white ring-teal-500/30";
    if (lvl >= 3) return "from-emerald-500 to-green-400 text-white ring-emerald-500/30";
    if (lvl >= 2) return "from-orange-500 to-red-500 text-white ring-orange-500/30";
    return "from-slate-500 to-slate-400 text-white ring-white/10";
  };

  const rankColor = getRankColor(levelInfo.level);

  return (
    <div className="sticky top-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-xl transition-all duration-300 hover:shadow-glow hover:border-white/[0.12] group/profile">
      {/* Banner Capa Premium com Efeito Nebulosa Animado */}
      <div className="h-24 w-full bg-gradient-to-tr from-violet-600 via-primary to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent opacity-80 animate-ambient-pulse" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Avatar flutuante e Informações básicas */}
      <div className="relative px-4 pb-4 pt-12 text-center flex flex-col items-center border-b border-white/[0.06] bg-white/[0.01]">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="relative">
            <Avatar initials={initials} size="lg" xp={xp} avatarUrl={myProfile?.avatar_url} />
            <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold bg-gradient-to-r ${rankColor} shadow-[0_2px_8px_rgba(0,0,0,0.5)]`}>
              {levelInfo.level}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-semibold truncate max-w-full text-foreground/90 mt-1">{name}</h3>
        
        {myProfile?.instagram && (
          <a
            href={`https://instagram.com/${myProfile.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-pink-400/80 hover:text-pink-400 transition mt-1 flex items-center gap-1 font-medium bg-pink-500/5 px-2 py-0.5 rounded-full border border-pink-500/10"
          >
            @{myProfile.instagram.replace("@", "")}
          </a>
        )}
        
        {myProfile?.plan && myProfile.plan !== "Free" && (
          <span className="mt-2.5 inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[9px] font-bold text-primary uppercase tracking-wider shadow-[0_2px_8px_rgba(var(--primary),0.1)]">
            {myProfile.plan}
          </span>
        )}
      </div>

      {/* XP e Gamificação */}
      <div className="p-4 space-y-3.5 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Patente</span>
            <span className="text-xs font-semibold text-foreground/90">{levelInfo.title}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60 font-mono bg-white/5 px-2 py-1 rounded border border-white/[0.04]">
            {levelInfo.currentXp} / {levelInfo.nextLevelXp} XP
          </span>
        </div>

        {/* Barra de Progresso Premium */}
        <div className="relative">
          <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden border border-white/[0.04] p-[1px]">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${rankColor} transition-all duration-500 relative`}
              style={{ width: `${Math.min(100, (levelInfo.currentXp / levelInfo.nextLevelXp) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] animate-pulse" />
            </div>
          </div>
          <div className="absolute right-0 -bottom-5 text-[9px] text-muted-foreground/40 font-medium">
            {Math.round((levelInfo.currentXp / levelInfo.nextLevelXp) * 100)}% concluído
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/50 text-center leading-normal pt-2.5">
          Participe das discussões e assista às aulas para evoluir de nível!
        </p>
      </div>
    </div>
  );
}

/* ─── Avatar & Level Badge Premium ─── */

function LevelBadge({ xp }: { xp: number }) {
  const levelInfo = getLevel(xp);
  const getRankColor = (lvl: number) => {
    if (lvl >= 8) return "from-yellow-400/20 to-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]";
    if (lvl >= 7) return "from-fuchsia-500/20 to-purple-600/20 text-purple-300 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]";
    if (lvl >= 6) return "from-violet-500/20 to-indigo-600/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.15)]";
    if (lvl >= 5) return "from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.1)]";
    if (lvl >= 4) return "from-teal-500/20 to-emerald-500/20 text-emerald-300 border-teal-500/30";
    if (lvl >= 3) return "from-emerald-500/20 to-green-500/20 text-green-300 border-emerald-500/30";
    if (lvl >= 2) return "from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30";
    return "from-slate-500/10 to-slate-600/10 text-slate-400 border-slate-500/20";
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold bg-gradient-to-r backdrop-blur-sm tracking-wide ${getRankColor(levelInfo.level)}`}>
      Nível {levelInfo.level} • {levelInfo.title}
    </span>
  );
}

function Avatar({ initials, size = "md", xp = 0, avatarUrl = null }: { initials: string; size?: "sm" | "md" | "lg"; xp?: number; avatarUrl?: string | null }) {
  const levelInfo = getLevel(xp);
  const cls = size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-20 w-20 text-xl border-4 border-background shadow-2xl" : "h-10 w-10 text-xs";

  const getRingColor = (lvl: number) => {
    if (lvl >= 8) return "ring-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.35)]";
    if (lvl >= 7) return "ring-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.35)]";
    if (lvl >= 6) return "ring-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.35)]";
    if (lvl >= 5) return "ring-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.25)]";
    if (lvl >= 4) return "ring-teal-500/30";
    if (lvl >= 3) return "ring-emerald-500/30";
    if (lvl >= 2) return "ring-orange-500/30";
    return "ring-white/10";
  };

  const ringCls = getRingColor(levelInfo.level);

  return (
    <div className={`${cls} rounded-full shrink-0 ring-2 ${ringCls} overflow-hidden bg-background flex items-center justify-center font-bold text-primary-foreground`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover transition-transform duration-300 hover:scale-110" />
      ) : (
        <div className="h-full w-full gradient-primary flex items-center justify-center uppercase">
          {initials}
        </div>
      )}
    </div>
  );
}

/* ─── Post Card ─── */

function PostCard({ post, userId, saved, onLike, onDelete, onSave, onEdit }: { 
  post: Post; 
  userId: string; 
  saved: boolean; 
  onLike: () => void; 
  onDelete: () => void; 
  onSave: () => void; 
  onEdit: (id: string, content: string) => Promise<void>;
}) {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const name = post.author?.full_name || "Membro";
  const initial = name.slice(0, 2).toUpperCase();
  const mine = post.user_id === userId;
  const xpValue = post.author?.xp ?? 0;

  useEffect(() => {
    setEditContent(post.content || "");
  }, [post.content]);

  const handleShare = () => {
    // Cria um texto amigável com um link simulado para a comunidade
    const textSnippet = post.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 80) + "..." : "uma imagem";
    const shareText = `Confira a publicação de ${name} na Comunidade Nebula:\n"${textSnippet}"\n\nParticipe você também!`;
    navigator.clipboard.writeText(shareText);
    toast.success("Mensagem de compartilhamento copiada para o seu CTRL+V!");
  };

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md overflow-hidden hover:bg-white/[0.02] hover:border-white/[0.1] hover:shadow-glass transition-all duration-300 group relative">
      {/* Linha vertical conectora de threads para comentários aberta */}
      {showComments && (
        <div className="absolute top-[60px] bottom-0 left-[29px] w-[1px] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      )}
      
      {/* Author header */}
      <div className="px-5 pt-5 pb-0 flex items-center gap-3 relative z-10">
        <Avatar initials={initial} xp={xpValue} avatarUrl={post.author?.avatar_url} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground/95 truncate hover:text-primary transition-colors cursor-default">{name}</span>
            <LevelBadge xp={xpValue} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground/60 font-medium">{formatTime(post.created_at)}</span>
            {post.author?.instagram && (
              <a 
                href={`https://instagram.com/${post.author.instagram.replace("@", "")}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-pink-400/70 hover:text-pink-400 font-medium transition-colors"
              >
                @{post.author.instagram.replace("@", "")}
              </a>
            )}
          </div>
        </div>
        
        {mine && !isEditing && (
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground hover:text-[#8b5cf6] p-2 rounded-xl hover:bg-[#8b5cf6]/10 transition-all duration-200 cursor-pointer"
              aria-label="Editar"
              title="Editar publicação"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
              aria-label="Apagar"
              title="Apagar publicação"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="px-5 pt-3 pb-2 relative z-10 pl-[62px] space-y-3 animate-fade-up">
          <RichTextEditor
            content={editContent}
            onChange={(html) => setEditContent(html)}
            placeholder="O que está pensando hoje para compartilhar?"
            minHeight="80px"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(post.content || "");
              }}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-[11px] font-semibold text-slate-300 transition-all active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (!editContent.trim() && !post.image_url) {
                  toast.error("O conteúdo da publicação não pode estar vazio!");
                  return;
                }
                await onEdit(post.id, editContent);
                setIsEditing(false);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-[11px] font-semibold text-white transition-all active:scale-95 cursor-pointer shadow-md shadow-purple-500/15"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <div className="px-5 pt-3 pb-1 relative z-10 pl-[62px]">
            <div className="text-[13px] leading-[1.6] break-words text-foreground/90 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
        )
      )}

      {/* Image */}
      {post.image_url && (
        <div className="mt-3 mx-5 rounded-xl overflow-hidden border border-white/[0.06] ml-[62px] relative z-10 group/img shadow-md">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full max-h-[380px] object-cover transition-transform duration-500 group-hover/img:scale-101"
            loading="lazy"
          />
        </div>
      )}

      {/* Actions (Curtir, Comentar, Salvar, Compartilhar) */}
      <div className="px-5 py-3.5 mt-2 flex items-center gap-2 pl-[62px] border-t border-white/[0.02] relative z-10">
        {/* Curtir */}
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
            post.liked
              ? "text-rose-400 bg-rose-500/10 border border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          <Heart className={`h-4 w-4 transition-transform duration-300 ${post.liked ? "scale-120 animate-ambient-pulse" : ""}`} fill={post.liked ? "currentColor" : "none"} />
          <span className="tabular-nums">{post.likes || ""}</span>
        </button>

        {/* Comentar */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border duration-200 hover:scale-105 active:scale-95 ${
            showComments
              ? "text-foreground bg-white/5 border-white/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{post.commentCount || ""}</span>
          {post.commentCount > 0 && (showComments ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />)}
        </button>

        {/* Compartilhar */}
        <button
          onClick={handleShare}
          className="inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent transition-all duration-200 hover:scale-105 active:scale-95"
          title="Compartilhar publicação"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {/* Salvar */}
        <button
          onClick={onSave}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border duration-200 hover:scale-105 active:scale-95 ml-auto ${
            saved
              ? "text-amber-400 bg-amber-500/10 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent"
          }`}
        >
          <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <CommentSection postId={post.id} postOwnerId={post.user_id} comments={post.comments} userId={userId} />
      )}
    </article>
  );
}

/* ─── Comment Section ─── */

function CommentSection({ postId, postOwnerId, comments, userId }: { postId: string; postOwnerId: string; comments: Comment[]; userId: string }) {
  const [text, setText] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const addXp = useAddXp();

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const clearImg = () => {
    setImgFile(null);
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    setImgPreview(null);
    if (imgRef.current) imgRef.current.value = "";
  };

  const addComment = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content && !imgFile) return;

      let image_url: string | null = null;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, imgFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const { error } = await (supabase as any).from("comments").insert({
        post_id: postId,
        user_id: userId,
        content: content || null,
        image_url,
      });
      if (error) throw error;

      // Notificar o autor do post
      const { data: profile } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const actorName = profile?.full_name || "Alguém";
      notifyUser({ recipientId: postOwnerId, actorId: userId, title: "Novo comentário no seu post", content: `${actorName} comentou no seu post` });
    },
    onSuccess: () => { 
      sendMentionNotifications(text, "Alguém", "Comunidade (Comentário)");
      setText(""); clearImg(); qc.invalidateQueries({ queryKey: ["posts"] }); addXp.mutate("comment"); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("comments").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addComment.mutate(); }
  };

  return (
    <div className="border-t border-white/[0.05] bg-black/15 pb-2 animate-fade-up">
      {comments.length > 0 && (
        <div className="px-5 py-4 space-y-4 max-h-[380px] overflow-y-auto pl-[62px]">
          {comments.map((c, index) => {
            const cName = c.author?.full_name || "Membro";
            const cInit = cName.slice(0, 2).toUpperCase();
            const isMine = c.user_id === userId;
            const cXp = c.author?.xp ?? 0;
            return (
              <div key={c.id} className="flex gap-3 group/comment relative items-start">
                <Avatar initials={cInit} size="sm" xp={cXp} avatarUrl={c.author?.avatar_url} />
                
                <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.025] border border-white/[0.05] px-3.5 py-2.5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200 relative group/balloon shadow-sm">
                  {/* Detalhes de Cabeçalho do Balão */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-foreground/90">{cName}</span>
                      <LevelBadge xp={cXp} />
                      <span className="text-[9px] text-muted-foreground/50 font-medium">{formatTime(c.created_at)}</span>
                    </div>
                    {isMine && (
                      <button
                        onClick={() => { confirm({ title: "Apagar comentário?", confirmLabel: "Apagar" }).then((ok) => { if (ok) deleteComment.mutate(c.id); }); }}
                        className="opacity-0 group-hover/balloon:opacity-100 text-muted-foreground hover:text-red-400 p-0.5 rounded transition-all duration-200"
                        title="Apagar comentário"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Conteúdo do comentário */}
                  {c.content && <p className="text-[11.5px] text-foreground/80 mt-1 leading-relaxed break-words">{c.content}</p>}
                  
                  {c.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.06] max-h-48 shadow-sm">
                      <img src={c.image_url} alt="" className="w-full max-h-48 object-cover" loading="lazy" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comment composer */}
      <div className="px-5 py-3 border-t border-white/[0.04] pl-[62px]">
        {imgPreview && (
          <div className="relative mb-2 ml-9 rounded-lg overflow-hidden border border-white/10 max-h-32 w-fit animate-fade-up">
            <img src={imgPreview} alt="Preview" className="max-h-32 object-cover" />
            <button onClick={clearImg} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center shadow-md">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2.5">
          <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário (Pressione Enter para enviar)..."
            className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs outline-none placeholder:text-muted-foreground/35 focus:border-primary/40 focus:bg-white/[0.04] focus:ring-1 focus:ring-primary/40 transition-all duration-200"
          />
          
          <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImg} />
          
          <button 
            onClick={() => imgRef.current?.click()} 
            className="p-2 rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
            title="Adicionar imagem ao comentário"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => addComment.mutate()}
            disabled={(!text.trim() && !imgFile) || addComment.isPending}
            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
            title="Enviar comentário"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
