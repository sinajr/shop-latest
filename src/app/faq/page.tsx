
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
  const faqItems = [
    {
      question: "What payment methods do you accept?",
      answer: "We accept Visa, MasterCard, American Express, PayPal, and Elite Stuff Trade Store Credit. All transactions are securely processed.",
    },
    {
      question: "What is your return policy?",
      answer: "We offer a 14-day return policy for most items in new, unworn condition with all original tags and packaging. Some exclusions apply for limited edition or special order items. Please see our full Shipping & Returns page for details.",
    },
    {
      question: "How long does shipping take?",
      answer: "Standard shipping within the continental US typically takes 3-5 business days. Expedited options are available. International shipping times vary. You will receive a tracking number once your order ships.",
    },
    {
      question: "Are all your items authentic?",
      answer: "Yes, Elite Stuff Trade guarantees the authenticity of every item we sell. We source our products from authorized dealers and trusted consignors, and each item undergoes a rigorous authentication process by our experts.",
    },
    {
      question: "How can I track my order?",
      answer: "Once your order has shipped, you will receive an email with a tracking number and a link to the carrier's website. You can also track your order status by logging into your account on our website.",
    },
    {
      question: "Do you offer international shipping?",
      answer: "Yes, we ship to most countries worldwide. Shipping costs and delivery times vary depending on the destination. Please note that customers are responsible for any applicable import duties or taxes.",
    }
  ];

  return (
    <div className="container mx-auto py-8 md:py-12">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
            Frequently Asked Questions
          </CardTitle>
          <CardDescription className="text-md md:text-lg text-muted-foreground mt-2">
            Find answers to common questions about our products, services, and policies. If your question isn&apos;t answered here, feel free to contact us at <a href="mailto:support@elitestufftrade.com" className="text-accent hover:underline">support@elitestufftrade.com</a>.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 py-6">
          {faqItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-lg hover:text-accent text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground">No FAQs available at the moment. Please check back later.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
