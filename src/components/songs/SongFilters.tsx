import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LANGUAGES } from "@/lib/constants";

interface Genre {
  id: string;
  name: string;
}

interface Mood {
  id: string;
  name: string;
}

export interface SongFiltersState {
  search: string;
  genre: string;
  mood: string;
  language: string;
  priceRange: [number, number];
  bpmRange: [number, number];
  hasAudio: boolean;
  hasLyrics: boolean;
  sortBy: string;
}

interface SongFiltersProps {
  filters: SongFiltersState;
  onFiltersChange: (filters: SongFiltersState) => void;
  genres: Genre[];
  moods: Mood[];
}

export function SongFilters({ filters, onFiltersChange, genres, moods }: SongFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof SongFiltersState>(key: K, value: SongFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      genre: "",
      mood: "",
      language: "",
      priceRange: [0, 50000],
      bpmRange: [60, 200],
      hasAudio: false,
      hasLyrics: false,
      sortBy: "newest",
    });
  };

  const activeFiltersCount = [
    filters.genre,
    filters.mood,
    filters.language,
    filters.hasAudio,
    filters.hasLyrics,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 50000,
    filters.bpmRange[0] > 60 || filters.bpmRange[1] < 200,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search - Made larger and more prominent */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search songs, artists, genres..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-12 h-12 text-base bg-card/50 border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Sort */}
        <Select value={filters.sortBy} onValueChange={(v) => updateFilter("sortBy", v)}>
          <SelectTrigger className="w-full sm:w-44 bg-card/50 border-border/50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile Filter Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="sm:hidden relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-6 overflow-y-auto">
              <FilterContent
                filters={filters}
                updateFilter={updateFilter}
                genres={genres}
                moods={moods}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear All
              </Button>
              <Button onClick={() => setIsOpen(false)} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filters */}
      <div className="hidden sm:flex flex-wrap gap-3">
        <Select value={filters.genre} onValueChange={(v) => updateFilter("genre", v)}>
          <SelectTrigger className="w-40 bg-card/50 border-border/50">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.id} value={genre.id}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.mood} onValueChange={(v) => updateFilter("mood", v)}>
          <SelectTrigger className="w-40 bg-card/50 border-border/50">
            <SelectValue placeholder="Mood" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Moods</SelectItem>
            {moods.map((mood) => (
              <SelectItem key={mood.id} value={mood.id}>
                {mood.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.language} onValueChange={(v) => updateFilter("language", v)}>
          <SelectTrigger className="w-40 bg-card/50 border-border/50">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="hasAudio"
            checked={filters.hasAudio}
            onCheckedChange={(checked) => updateFilter("hasAudio", !!checked)}
          />
          <Label htmlFor="hasAudio" className="text-sm cursor-pointer">Audio</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="hasLyrics"
            checked={filters.hasLyrics}
            onCheckedChange={(checked) => updateFilter("hasLyrics", !!checked)}
          />
          <Label htmlFor="hasLyrics" className="text-sm cursor-pointer">Lyrics</Label>
        </div>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterContent({
  filters,
  updateFilter,
  genres,
  moods,
}: {
  filters: SongFiltersState;
  updateFilter: <K extends keyof SongFiltersState>(key: K, value: SongFiltersState[K]) => void;
  genres: Genre[];
  moods: Mood[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Genre</Label>
        <Select value={filters.genre} onValueChange={(v) => updateFilter("genre", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.id} value={genre.id}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Mood</Label>
        <Select value={filters.mood} onValueChange={(v) => updateFilter("mood", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Moods</SelectItem>
            {moods.map((mood) => (
              <SelectItem key={mood.id} value={mood.id}>
                {mood.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Language</Label>
        <Select value={filters.language} onValueChange={(v) => updateFilter("language", v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}</Label>
        <Slider
          value={filters.priceRange}
          min={0}
          max={50000}
          step={500}
          onValueChange={(v) => updateFilter("priceRange", v as [number, number])}
        />
      </div>

      <div className="space-y-3">
        <Label>BPM Range: {filters.bpmRange[0]} - {filters.bpmRange[1]}</Label>
        <Slider
          value={filters.bpmRange}
          min={60}
          max={200}
          step={5}
          onValueChange={(v) => updateFilter("bpmRange", v as [number, number])}
        />
      </div>

      <div className="space-y-3">
        <Label>Content Type</Label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasAudioMobile"
              checked={filters.hasAudio}
              onCheckedChange={(checked) => updateFilter("hasAudio", !!checked)}
            />
            <Label htmlFor="hasAudioMobile" className="cursor-pointer">Has Audio</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasLyricsMobile"
              checked={filters.hasLyrics}
              onCheckedChange={(checked) => updateFilter("hasLyrics", !!checked)}
            />
            <Label htmlFor="hasLyricsMobile" className="cursor-pointer">Has Lyrics</Label>
          </div>
        </div>
      </div>
    </>
  );
}
