
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  return (
    <div className="container mx-auto py-8 md:py-12">
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground text-center py-8 md:py-12">
          <CardTitle className="text-3xl md:text-4xl font-bold">
            Get In Touch
          </CardTitle>
          <CardDescription className="text-md md:text-lg text-primary-foreground/80 mt-2 max-w-2xl mx-auto">
            We're here to help! Whether you have a question about our products, an order, or just want to say hello, feel free to reach out.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 py-8 md:py-10 grid md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Contact Form Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-accent" /> Send Us a Message
            </h2>
            <form className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
                <Input id="name" name="name" placeholder="Your Name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="subject" className="text-muted-foreground">Subject</Label>
                <Input id="subject" name="subject" placeholder="e.g., Question about an order" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="message" className="text-muted-foreground">Message</Label>
                <Textarea id="message" name="message" placeholder="Type your message here..." rows={5} className="mt-1" />
              </div>
              <Button type="submit" className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                Send Message
              </Button>
               <p className="text-xs text-muted-foreground italic mt-2">Note: This is a demo form. Submissions are not currently processed.</p>
            </form>
          </div>

          {/* Contact Info Section */}
          <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold text-primary mb-4">Contact Information</h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <Mail className="h-6 w-6 text-accent mr-3 mt-1 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground">Email Us</h3>
                      <a href="mailto:support@elitestufftrade.com" className="text-muted-foreground hover:text-accent hover:underline">
                        support@elitestufftrade.com
                      </a>
                      <p className="text-xs text-muted-foreground/70">We typically respond within 24 hours.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Phone className="h-6 w-6 text-accent mr-3 mt-1 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground">Call Us</h3>
                      <a href="tel:+18005555893" className="text-muted-foreground hover:text-accent hover:underline">
                        +1 (800) 555-LUXE (5893)
                      </a>
                      <p className="text-xs text-muted-foreground/70">Mon - Fri, 9 AM - 6 PM (PST)</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <MapPin className="h-6 w-6 text-accent mr-3 mt-1 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground">Visit Our Boutique</h3>
                      <address className="text-muted-foreground not-italic">
                        123 Luxury Avenue, Suite 100<br />
                        Beverly Hills, CA 90210, USA
                      </address>
                       <p className="text-xs text-muted-foreground/70">By appointment only.</p>
                    </div>
                  </li>
                </ul>
            </div>
            
            {/* Optional: Map Embed Placeholder */}
            <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                 <div className="w-full h-64 bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground italic">(Embedded Map Placeholder)</p>
                 </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
