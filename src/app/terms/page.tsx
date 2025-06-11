
"use client"; // Ensure this is a client component

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react"; // Import useState and useEffect

export default function TermsPage() {
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string | null>(null);

  useEffect(() => {
    // Set the date only on the client side after hydration
    setLastUpdatedDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div className="container mx-auto py-8 md:py-12">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
            Terms of Service
          </CardTitle>
          <CardDescription className="text-md md:text-lg text-muted-foreground mt-2">
            Please read these terms carefully before using our services.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 py-6">
          <ScrollArea className="h-[60vh] md:h-[70vh] pr-4">
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using the Elite Stuff Trade website (the "Service"), operated by Luxe Collective Inc. ("us", "we", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">2. Accounts</h2>
                <p>
                  When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">3. Purchases</h2>
                <p>
                  If you wish to purchase any product or service made available through the Service ("Purchase"), you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information. You represent and warrant that: (i) you have the legal right to use any credit card(s) or other payment method(s) in connection with any Purchase; and that (ii) the information you supply to us is true, correct, and complete.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">4. Content</h2>
                <p>
                  Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">5. Intellectual Property</h2>
                <p>
                  The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Luxe Collective Inc. and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">6. Links To Other Web Sites</h2>
                <p>
                  Our Service may contain links to third-party web sites or services that are not owned or controlled by Luxe Collective Inc. Luxe Collective Inc. has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">7. Termination</h2>
                <p>
                    We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">8. Limitation Of Liability</h2>
                <p>
                  In no event shall Luxe Collective Inc., nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">9. Governing Law</h2>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">10. Changes</h2>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">11. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please <a href="/contact" className="text-accent hover:underline">contact us</a> or email us at <a href="mailto:support@elitestufftrade.com" className="text-accent hover:underline">support@elitestufftrade.com</a>.
                </p>
                <p className="mt-2 text-sm">
                  {lastUpdatedDate ? `Last updated: ${lastUpdatedDate}` : 'Loading date...'}
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
