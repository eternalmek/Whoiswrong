import { Redirect } from 'expo-router';
import React from 'react';

import { useSession } from './_layout';

export default function Index() {
  const { session } = useSession();

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  return <Redirect href="/login" />;
}
