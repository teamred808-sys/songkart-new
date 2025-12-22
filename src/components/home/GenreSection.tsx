import { Link } from "react-router-dom";
import { useGenres } from "@/hooks/useSongs";
import { Skeleton } from "@/components/ui/skeleton";
import { Music2, Headphones, Guitar, Mic, Radio, Disc3 } from "lucide-react";

const genreIcons: Record<string, React.ElementType> = {
  "Pop": Headphones,
  "Rock": Guitar,
  "Hip Hop": Mic,
  "R&B": Radio,
  "Electronic": Disc3,
  "default": Music2,
};

const genreGradients: Record<string, string> = {
  "Pop": "from-pink-500/20 to-purple-500/20",
  "Rock": "from-red-500/20 to-orange-500/20",
  "Hip Hop": "from-yellow-500/20 to-amber-500/20",
  "R&B": "from-blue-500/20 to-indigo-500/20",
  "Electronic": "from-cyan-500/20 to-teal-500/20",
  "Jazz": "from-amber-500/20 to-yellow-500/20",
  "Classical": "from-slate-500/20 to-gray-500/20",
  "Country": "from-orange-500/20 to-yellow-500/20",
  "default": "from-primary/20 to-accent/20",
};

const GenreSection = () => {
  const { data: genres, isLoading } = useGenres();

  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Browse by Genre
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find the perfect sound for your project across all music styles
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {genres?.slice(0, 6).map((genre) => {
              const Icon = genreIcons[genre.name] || genreIcons.default;
              const gradient = genreGradients[genre.name] || genreGradients.default;

              return (
                <Link
                  key={genre.id}
                  to={`/browse?genre=${genre.id}`}
                  className={`group relative aspect-square rounded-2xl bg-gradient-to-br ${gradient} border border-border/50 p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-glow`}
                >
                  <div className="p-4 rounded-full bg-background/50 group-hover:bg-background/80 transition-colors">
                    <Icon className="w-8 h-8 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-semibold text-foreground text-center">
                    {genre.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default GenreSection;
