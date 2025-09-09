import { Edit, Image, Video, Users, Music, Volume2, Box } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AIToolCard from "./Card";

type CardItem = {
  slug: string; // this will be the route id
  title: string;
  subtitle: string;
  image: string;
};

export function Grid() {
  const sidebarItems = [
    { icon: <Edit size={18} />, label: "text" },
    { icon: <Image size={18} />, label: "image" },
    { icon: <Video size={18} />, label: "video" },
    { icon: <Users size={18} />, label: "avatars" },
    { icon: <Volume2 size={18} />, label: "voice" },
    { icon: <Music size={18} />, label: "music" },
    { icon: <Box size={18} />, label: "3d" },
  ];

  const cards: CardItem[] = [
    {
      slug: "photorealistic-images",
      title: "photorealistic images",
      subtitle: "create high-fidelity, realistic images",
      image: "/path-to-image-1.jpg",
    },
    {
      slug: "artistic-images",
      title: "artistic images",
      subtitle: "create images in various artistic styles",
      image: "/path-to-image-2.jpg",
    },
    {
      slug: "character-design",
      title: "character design",
      subtitle: "create characters for your workflows",
      image: "/path-to-image-3.jpg",
    },
    {
      slug: "full-scenes",
      title: "full-scene compositions",
      subtitle: "create complete scenes",
      image: "/path-to-image-4.jpg",
    },
    {
      slug: "recreate-images",
      title: "recreate images",
      subtitle: "recreate any image inside the tool",
      image: "/path-to-image-5.jpg",
    },
    {
      slug: "realtime-generation",
      title: "realtime generation",
      subtitle: "test your prompts in real-time",
      image: "/path-to-image-6.jpg",
    },
  ];

  return (
    <section className="mt-8 grid grid-cols-[150px,1fr] gap-6 mb-20">
      <h3 className="col-start-2 text-xl font-light font-cabin text-d-text">create</h3>

      <aside className="row-start-2 hidden md:flex flex-col gap-4">
        {sidebarItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 text-d-white hover:text-d-orange transition duration-200 cursor-pointer group"
          >
            <div className="p-2 rounded-lg bg-[#1b1c1e] border border-d-black group-hover:bg-[#222427]">
              {item.icon}
            </div>
            <span className="text-base font-raleway font-normal">{item.label}</span>
          </div>
        ))}
      </aside>

      <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <Link
            key={card.slug}
            to={`/ai-tools/${card.slug}`}
            className="block"
            aria-label={`Open ${card.title}`}
          >
            <motion.div>
              <AIToolCard
                image={card.image}
                title={card.title}
                subtitle={card.subtitle}
              />
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
}
