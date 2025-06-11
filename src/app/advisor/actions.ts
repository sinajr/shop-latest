
"use server";

import { getStyleAdvice, type StyleAdvisorInput, type StyleAdvisorOutput, type StyleAdvisorSuggestedProduct } from '@/ai/flows/style-advisor';
import { z } from 'zod';

const StyleAdvisorFormSchema = z.object({
  favoriteColor: z.string().min(1, "Favorite color is required."),
  favoriteBrand: z.string().min(1, "Favorite brand is required."),
  height: z.coerce.number().min(50, "Height must be at least 50cm.").max(300, "Height cannot exceed 300cm.").optional(),
  weight: z.coerce.number().min(20, "Weight must be at least 20kg.").max(300, "Weight cannot exceed 300kg.").optional(),
  itemType: z.string().min(1, "Item type is required."),
  intendedUseCase: z.string().min(1, "Intended use case is required."),
  preferredStyle: z.string().min(1, "Preferred style is required."),
});

// Use the specific type for suggested products
export type StyleAdvisorFormState = {
  message?: string | null;
  advice?: string | null;
  suggestedProducts?: StyleAdvisorSuggestedProduct[] | null; // Use the specific type here
  errors?: {
    favoriteColor?: string[];
    favoriteBrand?:string[];
    height?: string[];
    weight?: string[];
    itemType?: string[];
    intendedUseCase?: string[];
    preferredStyle?: string[];
    general?: string[];
  };
  status: 'idle' | 'loading' | 'success' | 'error';
  formData?: z.infer<typeof StyleAdvisorFormSchema>; // To repopulate form on error
};

export async function submitStyleAdvice(
  prevState: StyleAdvisorFormState,
  formData: FormData
): Promise<StyleAdvisorFormState> {

  const validatedFields = StyleAdvisorFormSchema.safeParse({
    favoriteColor: formData.get('favoriteColor'),
    favoriteBrand: formData.get('favoriteBrand'),
    height: formData.get('height') || undefined,
    weight: formData.get('weight') || undefined,
    itemType: formData.get('itemType'),
    intendedUseCase: formData.get('intendedUseCase'),
    preferredStyle: formData.get('preferredStyle'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check your inputs.",
      status: 'error',
      formData: Object.fromEntries(formData) as z.infer<typeof StyleAdvisorFormSchema>,
    };
  }

  const inputData: StyleAdvisorInput = Object.fromEntries(
      Object.entries(validatedFields.data).filter(([_, v]) => v !== undefined)
    ) as StyleAdvisorInput;


  try {
    const result: StyleAdvisorOutput = await getStyleAdvice(inputData);
    console.log("Style Advisor AI Output:", JSON.stringify(result, null, 2)); // Log the full AI output

    return {
      message: "Style advice generated successfully!",
      advice: result.advice,
      suggestedProducts: result.suggestedProducts || [], // Ensure it's an array
      status: 'success',
      formData: validatedFields.data,
    };
  } catch (error) {
    console.error("Error getting style advice:", error);
    return {
      message: "Failed to get style advice. Please try again later.",
      errors: { general: ["An unexpected error occurred."] },
      status: 'error',
      formData: validatedFields.data,
    };
  }
}
