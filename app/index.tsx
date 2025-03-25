import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import InitialLoading from '@/components/InitialLoading';

export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <InitialLoading />;
  }

  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}