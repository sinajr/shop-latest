"use client";

import React from 'react';
import Providers from '@/components/layout/providers';

export default function ClientRoot({ children }: { children: React.ReactNode }) {
    return <Providers>{children}</Providers>;
}
