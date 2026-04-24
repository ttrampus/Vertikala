import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle } from "lucide-react";
import ElevationDivider from "../components/ElevationDivider";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.message) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: form.email,
      subject: `Contact Form: ${form.subject || "General Inquiry"}`,
      body: `
        <h2>Contact Form Submission</h2>
        <p><strong>From:</strong> ${form.name} (${form.email})</p>
        <p><strong>Subject:</strong> ${form.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${form.message}</p>
      `,
    });
    setSending(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[40vh] overflow-hidden">
        <img
          src="https://media.base44.com/images/public/69d4d7507c9b580eb94e720c/42765933e_generated_8efccb5c.png"
          alt="Alpine glacier landscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-16 pb-12">
          <h1 className="font-inter font-extrabold text-4xl lg:text-5xl tracking-tighter">Contact</h1>
          <p className="font-serif text-lg text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Get in touch with us
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-inter font-bold text-xl tracking-tight mb-6">Get in Touch</h2>
              <div className="space-y-6">
                {[
                  { icon: Mail, label: "Email", value: "info@alpineclub.org" },
                  { icon: Phone, label: "Phone", value: "+386 1 234 5678" },
                  { icon: MapPin, label: "Address", value: "Dvoržakova 9,\n1000 Ljubljana, Slovenia" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-inter font-medium text-sm">{label}</p>
                      <p className="text-muted-foreground text-sm font-serif whitespace-pre-line">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border bg-card">
                <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="font-inter font-bold text-xl mb-2">Message Sent!</h3>
                <p className="text-muted-foreground font-serif text-center">Thank you for reaching out. We'll get back to you soon.</p>
                <Button variant="outline" className="mt-6" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-inter font-medium mb-2">Name</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-inter font-medium mb-2">Email *</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-inter font-medium mb-2">Subject</label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" />
                </div>
                <div>
                  <label className="block text-sm font-inter font-medium mb-2">Message *</label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message..." rows={6} className="font-serif resize-none" required />
                </div>
                <Button type="submit" disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}