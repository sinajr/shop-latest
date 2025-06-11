
"use client";

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Address } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import * as z from 'zod';
import { updateShippingAddress, type AddressFormState } from '@/app/profile/actions';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';

// Client-side Zod schema (should mirror server-side in actions.ts)
const ClientAddressSchema = z.object({
  street: z.string().min(3, "Street address is required (min 3 chars).").max(200),
  city: z.string().min(1, "City is required.").max(100),
  state: z.string().min(1, "State/Province is required.").max(100),
  zip: z.string().min(3, "ZIP/Postal code is required.").max(20),
  country: z.string().min(1, "Country is required.").max(100),
  isDefault: z.boolean().optional(),
  idToken: z.string().min(1, "Authentication token is required."), // For Server Action auth
});
type ClientAddressFormValues = z.infer<typeof ClientAddressSchema>;

// Initial state for useActionState
const initialServerFormState: AddressFormState = {
  status: 'idle',
  message: null,
  errors: {},
  fieldErrors: [], // Server-side Zod issues
  toastMessage: undefined,
};

interface AddressFormProps {
  onSaveSuccess: (message?: string) => void;
  addressToEdit: Address; // This form is now only for editing
}

export function AddressForm({ onSaveSuccess, addressToEdit }: AddressFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [idToken, setIdToken] = useState<string | null>(null);
  const [clientFormErrors, setClientFormErrors] = useState<z.ZodIssue[]>([]); // For client-side Zod issues
  const [generalError, setGeneralError] = useState<string | null>(null); // For general form error messages

  // Server Action for updating the address
  const boundUpdateShippingAddress = updateShippingAddress.bind(null, addressToEdit.id);
  const [serverState, formAction, isPending] = useActionState(boundUpdateShippingAddress, initialServerFormState);

  // Form field states - needed if we don't rely on defaultValues + form.action
  const [street, setStreet] = useState(addressToEdit?.street || '');
  const [city, setCity] = useState(addressToEdit?.city || '');
  const [state, setStateValue] = useState(addressToEdit?.state || ''); // Renamed to avoid conflict with React 'state'
  const [zip, setZip] = useState(addressToEdit?.zip || '');
  const [country, setCountry] = useState(addressToEdit?.country || '');
  const [isDefault, setIsDefault] = useState(addressToEdit?.isDefault || false);


  useEffect(() => {
    if (user) {
      user.getIdToken().then(setIdToken).catch(err => {
        console.error("AddressForm (Edit): Error fetching ID token:", err);
        setGeneralError("Failed to get authentication token. Please try again.");
        toast({ title: "Authentication Error", description: "Could not fetch session token.", variant: "destructive" });
      });
    }
  }, [user, toast]);

  useEffect(() => {
    // Pre-fill form when addressToEdit changes (e.g., dialog opens)
    setStreet(addressToEdit?.street || '');
    setCity(addressToEdit?.city || '');
    setStateValue(addressToEdit?.state || '');
    setZip(addressToEdit?.zip || '');
    setCountry(addressToEdit?.country || '');
    setIsDefault(addressToEdit?.isDefault || false);
    setClientFormErrors([]); // Clear previous client errors
    setGeneralError(null);  // Clear previous general errors
  }, [addressToEdit]);

  // Effect to handle server action responses
  useEffect(() => {
    if (serverState.status === 'success') {
      toast({ title: "Success", description: serverState.toastMessage || serverState.message || "Address updated." });
      onSaveSuccess(serverState.toastMessage || serverState.message);
    } else if (serverState.status === 'error') {
      if (serverState.fieldErrors && serverState.fieldErrors.length > 0) {
        // Display server-side Zod validation errors
        setClientFormErrors(serverState.fieldErrors);
        const errorMessage = serverState.message || "Please correct the highlighted fields (server validation).";
        setGeneralError(errorMessage);
      } else {
        const errorMessage = serverState.message || "Failed to update address.";
        setGeneralError(errorMessage);
      }
      // Specific toast for server config errors if Admin SDK failed
      if (serverState.message?.includes("Admin SDK initialization failed")) {
        toast({ title: "Server Configuration Error", description: serverState.message, variant: "destructive", duration: 10000 });
      } else {
        toast({ title: "Error Updating Address", description: serverState.message || "An unexpected error occurred.", variant: "destructive" });
      }
    }
  }, [serverState, toast, onSaveSuccess]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Client-side validation before submitting to Server Action
    setClientFormErrors([]); // Clear previous errors
    setGeneralError(null);

    if (!user) {
      setGeneralError("You must be logged in to update an address.");
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      event.preventDefault();
      return;
    }
    if (!idToken) {
      setGeneralError("Authentication token is not ready. Please wait a moment and try again.");
      toast({ title: "Authentication Error", description: "Session token not ready.", variant: "destructive" });
      event.preventDefault();
      return;
    }

    const formData = new FormData(event.currentTarget);
    // Ensure values from controlled inputs are used if FormData isn't picking them up,
    // or ensure names match. For direct form action, rely on FormData.
    // For controlled components + manual action call, use state values.
    // Since we are letting the form submit with `action` prop, FormData is primary.

    const dataToValidate: ClientAddressFormValues = {
      street: formData.get('street') as string || '',
      city: formData.get('city') as string || '',
      state: formData.get('state') as string || '',
      zip: formData.get('zip') as string || '',
      country: formData.get('country') as string || '',
      isDefault: formData.get('isDefault') === 'on',
      idToken: idToken, // idToken from state
    };

    console.log("AddressForm (Edit): Data to validate (immediately before Zod parse):", dataToValidate);
    const clientValidationResult = ClientAddressSchema.safeParse(dataToValidate);

    if (!clientValidationResult.success) {
      const flattenedErrors = clientValidationResult.error.flatten();
      console.error("AddressForm (Edit): Client-side validation FAILED. Full flattened error:", flattenedErrors);

      setClientFormErrors(clientValidationResult.error.errors);

      let detailedGeneralErrorMessage = "Please correct the highlighted fields.";
      if (flattenedErrors.formErrors.length > 0) {
        detailedGeneralErrorMessage = `Form error: ${flattenedErrors.formErrors.join(', ')}. Also check highlighted fields.`;
      } else if (Object.keys(flattenedErrors.fieldErrors).length === 0 && clientValidationResult.error.issues.length > 0) {
        // If fieldErrors is empty, but there are issues, list them to help debug.
        detailedGeneralErrorMessage = `Validation issues: ${clientValidationResult.error.issues.map(iss => `${iss.path.join('.') || 'form'}: ${iss.message}`).join('; ')}`;
      }

      setGeneralError(detailedGeneralErrorMessage);

      toast({
        title: "Form Input Error (Client-Side)",
        description: detailedGeneralErrorMessage,
        variant: "destructive",
      });
      event.preventDefault(); // IMPORTANT: Stop form submission to server if client validation fails
      return;
    }

    console.log("AddressForm (Edit): Client-side validation PASSED. Allowing form submission to Server Action...");
    // If client-side validation passes, DO NOT call event.preventDefault().
    // Let the form submit naturally, which will invoke the `formAction` passed to `<form action={formAction}>`.

    event.preventDefault();
    const db = getFirestore();
    const ref = doc(db, "users", user.uid);

    try {
      await updateDoc(ref, {
        shippingAddresses: [{
          street: formData.get('street') as string || '',
          city: formData.get('city') as string || '',
          state: formData.get('state') as string || '',
          zip: formData.get('zip') as string || '',
          country: formData.get('country') as string || '',
          isDefault: formData.get('isDefault') === 'on',
        }]
      });

      toast({ title: "Success", description: "Address updated." });
      onSaveSuccess("Address updated.");
    } catch (error) {
      console.error("AddressForm (Edit): Error updating address:", error);
      toast({ title: "Error", description: "Failed to update address." });
      onSaveSuccess("Failed to update address.");
    }





  };

  // Helper to get error message for a specific field
  const getErrorForField = (fieldName: keyof Omit<ClientAddressFormValues, 'idToken' | 'isDefault'>): string | undefined => {
    // clientFormErrors is ZodIssue[]
    const error = clientFormErrors.find(err => err.path.length === 1 && err.path[0] === fieldName);
    return error?.message;
  };

  return (
    // Pass formAction (from useActionState, bound with addressId) to the form's `action` prop
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Hidden input to send idToken, Server Action will retrieve it */}
      <input type="hidden" name="idToken" value={idToken || ''} />

      <div>
        <Label htmlFor="street">Street Address</Label>
        <Input
          id="street"
          name="street"
          placeholder="123 Main St, Apt 4B"
          defaultValue={addressToEdit?.street || ''} // Use defaultValue for uncontrolled with form action
          disabled={isPending || !idToken}
          aria-invalid={!!getErrorForField('street')}
          aria-describedby={getErrorForField('street') ? 'street-error' : undefined}
        />
        {getErrorForField('street') && <p id="street-error" className="text-sm text-destructive mt-1">{getErrorForField('street')}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            placeholder="Anytown"
            defaultValue={addressToEdit?.city || ''}
            disabled={isPending || !idToken}
            aria-invalid={!!getErrorForField('city')}
            aria-describedby={getErrorForField('city') ? 'city-error' : undefined}
          />
          {getErrorForField('city') && <p id="city-error" className="text-sm text-destructive mt-1">{getErrorForField('city')}</p>}
        </div>
        <div>
          <Label htmlFor="state">State / Province</Label>
          <Input
            id="state"
            name="state"
            placeholder="CA"
            defaultValue={addressToEdit?.state || ''}
            disabled={isPending || !idToken}
            aria-invalid={!!getErrorForField('state')}
            aria-describedby={getErrorForField('state') ? 'state-error' : undefined}
          />
          {getErrorForField('state') && <p id="state-error" className="text-sm text-destructive mt-1">{getErrorForField('state')}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="zip">ZIP / Postal Code</Label>
          <Input
            id="zip"
            name="zip"
            placeholder="90210"
            defaultValue={addressToEdit?.zip || ''}
            disabled={isPending || !idToken}
            aria-invalid={!!getErrorForField('zip')}
            aria-describedby={getErrorForField('zip') ? 'zip-error' : undefined}
          />
          {getErrorForField('zip') && <p id="zip-error" className="text-sm text-destructive mt-1">{getErrorForField('zip')}</p>}
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            placeholder="USA"
            defaultValue={addressToEdit?.country || ''}
            disabled={isPending || !idToken}
            aria-invalid={!!getErrorForField('country')}
            aria-describedby={getErrorForField('country') ? 'country-error' : undefined}
          />
          {getErrorForField('country') && <p id="country-error" className="text-sm text-destructive mt-1">{getErrorForField('country')}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {/* For uncontrolled with form action, defaultChecked is preferred for Checkbox */}
        <Checkbox
          id="isDefault"
          name="isDefault"
          defaultChecked={addressToEdit?.isDefault || false}
          disabled={isPending || !idToken}
        />
        <Label htmlFor="isDefault" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Set as default shipping address
        </Label>
      </div>

      {/* Display general errors from client-side or server-side (if not field-specific from server) */}
      {generalError && (
        <Alert variant="destructive" className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {generalError}
          </AlertDescription>
        </Alert>
      )}
      {/* Display server-side errors that are not field-specific and not already covered by generalError */}
      {serverState.status === 'error' && !serverState.fieldErrors?.length && !generalError && (
        <Alert variant="destructive" className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Updating Address</AlertTitle>
          <AlertDescription>{serverState.message || "An unexpected error occurred on the server."}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isPending || !user || !idToken}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Update Address
      </Button>
      {(!user || !idToken) && !isPending && <p className="text-xs text-destructive text-center mt-2">Authentication issue. Please ensure you are logged in and session is ready.</p>}
    </form>
  );
}
