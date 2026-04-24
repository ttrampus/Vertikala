import { Mountain, Users, Target, MapPin } from "lucide-react";
import ElevationDivider from "../components/ElevationDivider";

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[50vh] overflow-hidden">
        <img
          src="https://media.base44.com/images/public/69d4d7507c9b580eb94e720c/b2e7eb4bc_generated_4d8ea35c.png"
          alt="Climber on rock face"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-16 pb-12">
          <h1 className="font-inter font-extrabold text-4xl lg:text-5xl tracking-tighter">About Us</h1>
          <p className="font-serif text-lg text-muted-foreground mt-2 max-w-xl leading-relaxed">
            The story behind the peaks we chase
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 space-y-16">
        {/* Mission */}
        <section>
          <h2 className="font-inter font-bold text-2xl tracking-tight mb-4">Our Mission</h2>
          <p className="font-serif text-lg leading-[1.65] text-foreground/90">
            The Alpine Club is a community of passionate mountaineers, climbers, and outdoor enthusiasts united by a love 
            for the vertical world. Founded to promote safe, responsible, and inspiring alpine activities, we bring together 
            people of all skill levels — from first-time hikers to seasoned expedition climbers.
          </p>
          <p className="font-serif text-lg leading-[1.65] text-foreground/90 mt-4">
            Our mission is to preserve the spirit of alpinism, foster community connections, and share the stories 
            that emerge from our adventures in the mountains. Every summit reached, every route pioneered, 
            and every sunrise witnessed from a ridge becomes part of our collective legacy.
          </p>
        </section>

        <ElevationDivider label="What We Do" />

        {/* Activities */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { icon: Mountain, title: "Alpine Climbing", desc: "Organized expeditions and climbing trips to peaks across the region, from beginner-friendly ascents to technical alpine routes." },
            { icon: Users, title: "Community Events", desc: "Regular meetups, training workshops, film screenings, and social gatherings that build lasting connections." },
            { icon: Target, title: "Skills Training", desc: "Comprehensive courses in mountaineering, rock climbing, ice climbing, navigation, and mountain safety." },
            { icon: MapPin, title: "Trail Maintenance", desc: "Volunteer programs to maintain and improve mountain trails, ensuring sustainable access for future generations." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-inter font-bold text-lg">{title}</h3>
              <p className="font-serif text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </section>

        <ElevationDivider label="Our History" />

        {/* History */}
        <section>
          <h2 className="font-inter font-bold text-2xl tracking-tight mb-4">A Legacy of Exploration</h2>
          <p className="font-serif text-lg leading-[1.65] text-foreground/90">
            For decades, our club has been at the forefront of alpine exploration in the region. What started as a 
            small group of friends sharing a rope has grown into a vibrant community of hundreds of active members. 
            Our archives contain stories of first ascents, daring traverses, and the quiet moments of solitude 
            that make mountain life so profound.
          </p>
          <p className="font-serif text-lg leading-[1.65] text-foreground/90 mt-4">
            Today, we continue that tradition — documenting our adventures through this platform, mentoring the 
            next generation of climbers, and ensuring that the mountains remain accessible and respected for 
            all who seek their heights.
          </p>
        </section>
      </div>
    </div>
  );
}