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
    { icon: <Edit className="size-4" />, label: "text" },
    { icon: <Image className="size-4" />, label: "image" },
    { icon: <Video className="size-4" />, label: "video" },
    { icon: <Users className="size-4" />, label: "avatars" },
    { icon: <Volume2 className="size-4" />, label: "voice" },
    { icon: <Music className="size-4" />, label: "music" },
    { icon: <Box className="size-4" />, label: "3d" },
  ];

  const createCards: CardItem[] = [
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
    // new create items
    {
      slug: "product-visualisations",
      title: "product visualisations",
      subtitle: "create product and packaging visuals",
      image: "/path-to-image-7.jpg",
    },
    {
      slug: "virtual-try-on",
      title: "virtual try-on",
      subtitle: "simulate products on models or users",
      image: "/path-to-image-8.jpg",
    },
    {
      slug: "brand-identity",
      title: "brand identity",
      subtitle: "create cohesive brand visuals and assets",
      image: "/path-to-image-9.jpg",
    },
    {
      slug: "infographics",
      title: "infographics",
      subtitle: "create clear, data-driven visuals",
      image: "/path-to-image-10.jpg",
    },
    {
      slug: "social-media",
      title: "social media",
      subtitle: "create posts, covers and ad creatives",
      image: "/path-to-image-11.jpg",
    },
  ];

  const editCards: CardItem[] = [
    {
      slug: "edit-image-details",
      title: "edit image details",
      subtitle: "adjust lighting, color, background and more",
      image: "/path-to-image-12.jpg",
    },
    {
      slug: "add-edit-text",
      title: "add/edit text",
      subtitle: "add or refine text inside images",
      image: "/path-to-image-13.jpg",
    },
    {
      slug: "style-reference",
      title: "style reference",
      subtitle: "apply visual styles from reference images",
      image: "/path-to-image-14.jpg",
    },
    {
      slug: "person-swap",
      title: "person swap",
      subtitle: "replace people while keeping composition",
      image: "/path-to-image-15.jpg",
    },
    {
      slug: "batch-edits",
      title: "batch edits",
      subtitle: "edit multiple images consistently",
      image: "/path-to-image-16.jpg",
    },
    {
      slug: "retouching",
      title: "retouching",
      subtitle: "cleanup, remove objects and fix flaws",
      image: "/path-to-image-17.jpg",
    },
    {
      slug: "upscaling",
      title: "upscaling",
      subtitle: "enhance resolution while preserving detail",
      image: "/path-to-image-18.jpg",
    },
  ];

  const personalizeCards: CardItem[] = [
    {
      slug: "style-tuning",
      title: "style tuning",
      subtitle: "personalize outputs to your brand/style",
      image: "/path-to-image-19.jpg",
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      {/* create */}
      <section className="grid grid-cols-[150px,1fr] gap-4">
        <h3 className="col-start-2 text-xl font-light font-cabin text-d-text">create</h3>

        <aside className="row-start-2 hidden md:flex flex-col gap-4">
          {sidebarItems.map((item, index) => (
            <div
              key={index}
              className="parallax flex items-center gap-3 text-d-white hover:text-d-orange transition duration-200 cursor-pointer group"
            >
              <div className="size-8 grid place-items-center rounded-lg bg-[#1b1c1e] border border-d-black group-hover:bg-[#222427] transition-colors duration-200">
                {item.icon}
              </div>
              <span className="text-base font-raleway font-normal">{item.label}</span>
            </div>
          ))}
        </aside>

        <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {createCards.map((card) => (
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

      {/* edit */}
      <section className="grid grid-cols-[150px,1fr] gap-4">
        <h3 className="col-start-2 text-xl font-light font-cabin text-d-text">edit</h3>

        <div className="row-start-2 col-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {editCards.map((card) => (
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

      {/* personalize */}
      <section className="grid grid-cols-[150px,1fr] gap-4">
        <h3 className="col-start-2 text-xl font-light font-cabin text-d-text">personalize</h3>

        <div className="row-start-2 col-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personalizeCards.map((card) => (
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
    </div>
  );
}
