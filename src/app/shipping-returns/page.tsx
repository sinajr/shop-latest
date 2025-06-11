
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, CornerDownLeft, ShieldCheck } from "lucide-react";

export default function ShippingReturnsPage() {
  return (
    <div className="container mx-auto py-8 md:py-12">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
            Shipping & Returns
          </CardTitle>
          <CardDescription className="text-md md:text-lg text-muted-foreground mt-2">
            Information about our shipping process and how to make a return.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 py-6 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3 flex items-center">
              <Truck className="mr-3 h-6 w-6 text-accent" /> Shipping Information
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                At Elite Stuff Trade, we are committed to delivering your luxury items swiftly and securely.
                All orders are processed within 1-2 business days.
              </p>
              
              <p><strong>Domestic Shipping (USA):</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Standard Shipping (3-5 business days): Calculated at checkout. Free on orders over $500.</li>
                <li>Expedited Shipping (1-2 business days): Calculated at checkout.</li>
              </ul>
              
              <p><strong>International Shipping:</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>We ship to most countries worldwide via trusted carriers like DHL and FedEx.</li>
                <li>Shipping times and costs vary by destination and will be calculated at checkout.</li>
                <li>Customers are responsible for any applicable import duties, taxes, or customs fees levied by their country.</li>
              </ul>
              
              <p>
                All shipments are fully insured and require a signature upon delivery for security purposes.
                You will receive a tracking number via email once your order has been dispatched.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3 flex items-center">
              <CornerDownLeft className="mr-3 h-6 w-6 text-accent" /> Return Policy
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                We want you to be completely satisfied with your purchase from Elite Stuff Trade. If for any reason you are not, we offer a 14-day return window from the date of delivery for most items.
              </p>
              
              <p><strong>Conditions for Return:</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Items must be in new, unworn, and unused condition.</li>
                <li>All original tags, packaging (boxes, dust bags, authenticity cards, etc.), and accessories must be intact and included.</li>
                <li>Watches must have all protective plastics and tags in place and must not have been sized or altered.</li>
                <li>Limited edition, special order, and personalized items may be subject to a restricted return policy or may be final sale. This will be clearly indicated on the product page.</li>
              </ul>
              
              <p><strong>How to Initiate a Return:</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Please contact our customer support team at <a href="mailto:support@elitestufftrade.com" className="text-accent hover:underline">support@elitestufftrade.com</a> within 14 days of receiving your order to request a Return Merchandise Authorization (RMA) number.</li>
                <li>Once your return is approved, you will receive instructions on how to send back your item.</li>
                <li>Return shipping costs are the responsibility of the customer, unless the item received was incorrect or faulty. We recommend using a trackable and insured shipping method.</li>
              </ul>
              
              <p><strong>Refunds:</strong></p>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Once we receive and inspect your return, we will process your refund to the original payment method within 5-7 business days.</li>
                <li>Original shipping charges (if any) are non-refundable.</li>
              </ul>
            </div>
          </section>

          <section>
             <h2 className="text-2xl font-semibold text-primary mb-3 flex items-center">
                <ShieldCheck className="mr-3 h-6 w-6 text-accent" /> Authenticity Guarantee
            </h2>
            <p className="text-muted-foreground leading-relaxed">
                Every item sold by Elite Stuff Trade is 100% authentic and rigorously inspected by our team of experts. We stand by the authenticity of our merchandise. If you have any concerns about the authenticity of an item you received, please contact us immediately.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
