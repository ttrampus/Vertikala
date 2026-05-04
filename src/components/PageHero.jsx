import { motion } from "framer-motion";

export default function PageHero({ image, title, alt, subtitle, tag, height = "40vh" }) {
  return (
    <section className="relative overflow-hidden" style={{ height }}>
      {image ? (
        <img
          src={image}
          alt={alt || (typeof title === "string" ? title : "")}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-zinc-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        className="absolute bottom-0 left-0 right-0 px-6 lg:px-16 pb-12"
      >
        {tag && (
          <p className="text-[10px] font-inter font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-1">
            {tag}
          </p>
        )}
        <h1 className="font-inter font-extrabold text-4xl lg:text-5xl tracking-tighter">
          {title}
        </h1>
        {subtitle && (
          <p className="font-serif text-lg text-muted-foreground mt-2 max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </motion.div>
    </section>
  );
}
