"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';

export function FloatingActionButtons() {
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleScrollToTopVisibility = () => {
    // Show scroll-to-top button after scrolling down 300px
    if (window.scrollY > 300) {
      setIsScrollToTopVisible(true);
    } else {
      setIsScrollToTopVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleScrollToTopVisibility);
    return () => {
      window.removeEventListener('scroll', toggleScrollToTopVisibility);
    };
  }, []);

  return (
    <>
      <div
        className='fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3'
      >
        {/* AI Chatbot Button (MessageCircle icon) */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsChatOpen(true)}
          className={cn(
            'h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90',
            'transform hover:scale-110 transition-transform duration-150 ease-in-out'
          )}
          aria-label="Open AI Luxury Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>

        {/* Scroll to Top Button - Conditionally Visible with Transition */}
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToTop}
          className={cn(
            'h-12 w-12 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-opacity duration-300 ease-in-out',
            isScrollToTopVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </div>

      {/* Chatbot Dialog */}
      <ChatbotDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}
