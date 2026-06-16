import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight, Sparkles } from "lucide-react";
import { getCheckpoint } from "@/lib/stories/checkpointClient";

/* ------------------------------ Covers ------------------------------ */
const sunMoonCover = "/book-image/sun-and-moon.png";
const necklaceCombCover = "/book-image/necklace-and-the-comb.png";
const BernardoCarpioCover = "/book-image/bernardo-carpio.jpg";

/* ------------------------------ Types ------------------------------- */
type StoryItem = {
  id: string;
  bookId?: number;
  title: string;
  description: string;
  coverImage: string;
  color: string;
  shadowColor: string;
  icon: string;
  pages: number;
};

/* ---------------------------- Story Card ---------------------------- */
function StoryCard({
  story,
  isLoaded,
  delayMs = 0,
}: {
  story: StoryItem;
  isLoaded: boolean;
  delayMs?: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/stories", story.id, "checkpoint"],
    queryFn: () => getCheckpoint(story.id),
    staleTime: 30_000,
  });

  const cp = data?.checkpoint ?? null;
  const pageNumber = typeof cp?.pageNumber === "number" ? cp.pageNumber : null;
  const percent =
    typeof cp?.percentComplete === "number"
      ? Math.max(0, Math.min(100, Math.round(cp.percentComplete)))
      : null;

  let ctaLabel = "Read Story";
  if (typeof percent === "number") {
    if (percent >= 100) ctaLabel = "Read again";
    else if (percent > 0 && pageNumber && pageNumber > 1) ctaLabel = `Continue (p. ${pageNumber})`;
  }

  return (
    <div
      className={`transition-all duration-1000 transform ${
        isLoaded ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
      }`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <Card
        className={`overflow-hidden bg-[#1a2232] border-0 h-full ${story.shadowColor}
          hover:-translate-y-2 hover:shadow-2xl transition-all duration-500
          rounded-[24px]`}
      >
        {/* -------------------------- Cover Section -------------------------- */}
        <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-in-out group-hover:scale-105"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if ((img.dataset as any).fallbackTried) return;
              (img.dataset as any).fallbackTried = "1";
              if (img.src.includes("%20")) {
                img.src = img.src.replace(/%20/g, " ");
              } else {
                img.src = img.src.replace(/ /g, "%20");
              }
            }}
          />

          {/* Icon Badge */}
          <div className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-gray-900/60 backdrop-blur-md rounded-full text-xl shadow-md border border-white/10">
            {story.icon}
          </div>

          {/* Progress chip */}
          {typeof percent === "number" && percent > 0 && (
            <div className="absolute bottom-4 left-4 z-10 text-xs font-sans font-semibold px-3 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white border border-white/10 shadow-sm">
              {percent >= 100 ? "100% complete" : `${percent}% complete`}
            </div>
          )}
        </div>

        {/* ---------------------- Text / Content Section ----------------------- */}
        {/* FIXED: Keeps layout boxes uniform while p-5 handles inner spacing boundaries neatly */}
        <div className="p-5 flex flex-col justify-between bg-[#111827] h-[220px]">
          
          {/* flex-grow handles short layout text blocks smoothly */}
          <div className="space-y-1 flex-grow">
            {/* FIXED: changed to line-clamp-2 and added text-xl with min-h-[56px] so no titles are cut off */}
            <h2 className="text-xl font-sans font-bold italic text-white tracking-wide line-clamp-2 min-h-[56px] flex items-centerSource">
              {story.title}
            </h2>
            {/* FIXED: Balanced with line-clamp-2 to maintain defensive spacing if titles hit two lines */}
            <p className="text-gray-300 font-sans font-medium italic text-xs sm:text-sm leading-relaxed line-clamp-2">
              {story.description}
            </p>
          </div>

          <div className="flex justify-between items-center mt-auto pt-2 border-t border-white/5">
            <span className="text-sm font-sans font-bold italic text-gray-400">
              {story.pages} pages
            </span>

            <Link href={`/student/read-twodanimation/${encodeURIComponent(story.id)}`}>
              <Button
                className={`bg-gradient-to-r ${story.color} hover:brightness-110 text-white
                  group font-sans font-bold italic shadow-md hover:shadow-lg rounded-full px-5 py-4 text-xs sm:text-sm`}
              >
                {isLoading ? (
                  "Loading…"
                ) : (
                  <>
                    <span>{ctaLabel}</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------- Page Shell ---------------------------- */
export default function TwoDAnimation() {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stories: StoryItem[] = [
    {
      id: "sun-moon",
      title: "The Sun and Moon",
      description: "Discover the ancient tale of how the Sun and Moon came to be.",
      coverImage: sunMoonCover,
      color: "from-[#D99A20] to-[#C78A17]",
      shadowColor: "shadow-[#D99A20]/20",
      icon: "☀️",
      pages: 15,
    },
    {
      id: "bernardo-carpio",
      title: "Alamat ni Bernardo Carpio",
      description:
        "Legend of the mighty hero trapped between mountains—strength, courage, resilience.",
      coverImage: BernardoCarpioCover,
      color: "from-emerald-600 to-green-500",
      shadowColor: "shadow-green-500/10",
      icon: "🗻",
      pages: 15,
    },
    {
      id: "necklace-comb",
      title: "The Necklace and the Comb",
      description: "Follow the journey of magical artifacts through generations.",
      coverImage: necklaceCombCover,
      color: "from-blue-600 to-indigo-500",
      shadowColor: "shadow-blue-500/10",
      icon: "✨",
      pages: 21,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 font-sans font-bold">
      <Header variant="student" />

      <main className="flex-grow p-4 md:p-6 text-white">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div
            className={`transition-all duration-1000 transform ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            } mb-8 text-center`}
          >
            <h1 className="text-4xl md:text-5xl font-sans font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
              2D Animated Storybooks
            </h1>
            <p className="text-lg md:text-xl font-sans font-medium text-purple-200 max-w-3xl mx-auto">
              Experience the magic of Filipino folklore through beautifully animated interactive stories
            </p>

            <div className="flex items-center justify-center mt-4">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-purple-500"></div>
              <Sparkles className="h-6 w-6 mx-2 text-purple-300" />
              <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-purple-500"></div>
            </div>
          </div>

          {/* Nav */}
          <div className="flex justify-end mb-4">
            <Link href="/student">
              <Button
                variant="outline"
                className="bg-transparent border-purple-500 text-purple-300 hover:bg-purple-950 flex items-center gap-2 font-sans font-bold"
              >
                <Home size={16} />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Story cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stories.map((story, i) => (
              <StoryCard key={story.id} story={story} isLoaded={isLoaded} delayMs={i * 200} />
            ))}
          </div>

          {/* About */}
          <div
            className={`transition-all duration-1000 transform ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            } bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-purple-800/30 mb-8 font-sans font-bold`}
            style={{ transitionDelay: "600ms" }}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-4">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-sans font-bold text-purple-300">About These Stories</h2>
            </div>

            <p className="mb-4 text-gray-300 font-sans font-medium leading-relaxed">
              These interactive 2D animated storybooks are part of our multimedia arts capstone project,
              showcasing traditional Filipino folktales in an engaging, animated format.
            </p>

            <p className="text-gray-300 font-sans font-medium leading-relaxed">
              Each story features custom illustrations, animations, and audio narration to create
              an immersive reading experience. The stories combine traditional Filipino cultural elements
              with modern digital storytelling techniques.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-gray-800/70 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-4xl mb-2">✨</div>
                <h3 className="font-sans font-bold text-purple-300 mb-1">Custom Animation</h3>
                <p className="text-sm font-sans font-medium text-gray-400">
                  Fluid 2D animations bring the stories to life
                </p>
              </div>

              <div className="bg-gray-800/70 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-4xl mb-2">🎵</div>
                <h3 className="font-sans font-bold text-purple-300 mb-1">Original Audio</h3>
                <p className="text-sm font-sans font-medium text-gray-400">
                  Atmospheric sounds and music enhance the experience
                </p>
              </div>

              <div className="bg-gray-800/70 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-4xl mb-2">🏮</div>
                <h3 className="font-sans font-bold text-purple-300 mb-1">Cultural Heritage</h3>
                <p className="text-sm font-sans font-medium text-gray-400">
                  Preserving Filipino folklore through digital media
                </p>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div
            className={`transition-all duration-1000 transform ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            } text-center mb-8`}
            style={{ transitionDelay: "700ms" }}
          >
            <p className="text-sm font-sans font-medium text-gray-400">
              A Multimedia Arts Capstone Project • Created with ❤️ • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}