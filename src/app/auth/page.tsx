
import { AuthForm } from '@/components/auth/auth-form';

interface AuthPageProps {
  params: { [key: string]: string | string[] | undefined };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function AuthPage({ params, searchParams }: AuthPageProps) {
  return (
    <div className="container mx-auto max-w-3xl py-12"> {/* Changed max-w-lg to max-w-3xl */}
      <AuthForm />
    </div>
  );
}
