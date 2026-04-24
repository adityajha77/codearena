import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import ScrollReveal from "@/components/ScrollReveal";
import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { toast } from "sonner";

const Contact = () => {
  const [type, setType] = useState("suggestion");
  const [isSending, setIsSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    setIsSending(true);
    try {
      await emailjs.sendForm(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        formRef.current,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      toast.success("Message sent successfully!");
      formRef.current.reset();
    } catch (error) {
      console.error("EmailJS Error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <Particles />
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-lg">
          <ScrollReveal>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-display mb-3">
                <span className="gradient-text-primary">Get in Touch</span>
              </h1>
              <p className="text-muted-foreground text-sm">Help us build the best coding challenge platform.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <form ref={formRef} onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex gap-2 flex-wrap mb-2">
                {["suggestion", "bug", "feature", "partnership"].map(t => (
                  <button type="button" key={t} onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                      type === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                    }`}>{t}</button>
                ))}
              </div>
              <input type="hidden" name="contact_type" value={type} />
              <input name="user_name" type="text" required placeholder="Your name" className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input name="user_email" type="email" required placeholder="Email address" className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <textarea name="message" required rows={4} placeholder="Your message..." className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              <button 
                type="submit" 
                disabled={isSending}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </ScrollReveal>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Contact;
