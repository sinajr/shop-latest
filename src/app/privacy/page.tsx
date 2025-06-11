
"use client"; // Ensure this is a client component

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react"; // Import useState and useEffect

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </CardTitle>
          <CardDescription className="text-md md:text-lg text-muted-foreground mt-2">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 py-6">
          <ScrollArea className="h-[60vh] md:h-[70vh] pr-4">
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">1. Introduction</h2>
                <p>
                  Welcome to Elite Stuff Trade ("us", "we", or "our"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.
                </p>
                <p className="mt-2">
                  This privacy policy applies to all information collected through our website (such as <a href="https://elitesstufftrade.com" className="text-accent hover:underline">elitesstufftrade.com</a>), and/or any related services, sales, marketing or events (we refer to them collectively in this privacy policy as the "Services").
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">2. Information We Collect</h2>
                <p>
                  We collect personal information that you voluntarily provide to us when registering at the Services, expressing an interest in obtaining information about us or our products and services, when participating in activities on the Services or otherwise contacting us.
                </p>
                <p className="mt-2">
                  The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make and the products and features you use. The personal information we collect can include the following:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>Personal Information Provided by You:</strong> We collect names; phone numbers; email addresses; mailing addresses; usernames; passwords; contact preferences; billing addresses; debit/credit card numbers; and other similar information.</li>
                  <li><strong>Payment Data:</strong> We may collect data necessary to process your payment if you make purchases, such as your payment instrument number (such as a credit card number), and the security code associated with your payment instrument. All payment data is stored by our payment processor and you should review its privacy policies and contact the payment processor directly to respond to your questions.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">3. How We Use Your Information</h2>
                <p>
                  We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We indicate the specific processing grounds we rely on next to each purpose listed below.
                </p>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>To facilitate account creation and logon process.</li>
                  <li>To send administrative information to you.</li>
                  <li>To fulfill and manage your orders.</li>
                  <li>To post testimonials (with your consent).</li>
                  <li>To send you marketing and promotional communications.</li>
                  <li>To protect our Services.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">4. Will Your Information Be Shared With Anyone?</h2>
                <p>
                  We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We may process or share data based on the following legal basis:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>Consent:</strong> We may process your data if you have given us specific consent to use your personal information in a specific purpose.</li>
                  <li><strong>Legitimate Interests:</strong> We may process your data when it is reasonably necessary to achieve our legitimate business interests.</li>
                  <li><strong>Performance of a Contract:</strong> Where we have entered into a contract with you, we may process your personal information to fulfill the terms of our contract.</li>
                  <li><strong>Legal Obligations:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">5. How Long Do We Keep Your Information?</h2>
                <p>
                  We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy policy, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">6. How Do We Keep Your Information Safe?</h2>
                <p>
                  We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">7. Do We Collect Information From Minors?</h2>
                <p>
                  We do not knowingly solicit data from or market to children under 18 years of age. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">8. What Are Your Privacy Rights?</h2>
                <p>
                  In some regions (like the European Economic Area and the UK), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information. To make such a request, please use the contact details provided below.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">9. Updates To This Policy</h2>
                <p>
                  We may update this privacy policy from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary mb-2">10. How Can You Contact Us About This Policy?</h2>
                <p>
                  If you have questions or comments about this policy, you may email us at <a href="mailto:support@elitestufftrade.com" className="text-accent hover:underline">support@elitestufftrade.com</a> or by post to:
                </p>
                <p className="mt-1">
                  Elite Stuff Trade<br /> 
                  123 Luxury Avenue, Suite 100<br />
                  Beverly Hills, CA 90210<br />
                  United States
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
