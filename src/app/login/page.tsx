'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
    interface Window {
        particlesJS: any;
    }
}

export default function LoginPage() {
    const router = useRouter();
    const particlesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load particles.js script
        const script = document.createElement('script');
        script.src = '/particles.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
            if (window.particlesJS && particlesRef.current) {
                window.particlesJS('particles-js', {
                    particles: {
                        number: {
                            value: 80,
                            density: {
                                enable: true,
                                value_area: 800
                            }
                        },
                        color: {
                            value: '#ffffff'
                        },
                        shape: {
                            type: 'circle'
                        },
                        opacity: {
                            value: 0.5,
                            random: false
                        },
                        size: {
                            value: 3,
                            random: true
                        },
                        line_linked: {
                            enable: true,
                            distance: 150,
                            color: '#ffffff',
                            opacity: 0.4,
                            width: 1
                        },
                        move: {
                            enable: true,
                            speed: 6,
                            direction: 'none',
                            random: false,
                            straight: false,
                            out_mode: 'out',
                            bounce: false
                        }
                    },
                    interactivity: {
                        detect_on: 'canvas',
                        events: {
                            onhover: {
                                enable: true,
                                mode: 'repulse'
                            },
                            onclick: {
                                enable: true,
                                mode: 'push'
                            },
                            resize: true
                        }
                    },
                    retina_detect: true
                });
            }
        };

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Add your login logic here
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen relative">
            <div id="particles-js" ref={particlesRef} className="absolute inset-0" />

            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                        <CardDescription className="text-center">Please sign in to your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    required
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">Password</label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    required
                                    className="w-full"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <a href="/register" className="text-blue-600 hover:underline">
                                Sign up
                            </a>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
} 