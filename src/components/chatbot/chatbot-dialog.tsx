"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import Link from 'next/link'; // Import Link
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Loader2, MessageSquareText, Image as ImageIcon, XCircle } from 'lucide-react'; // Added ImageIcon and XCircle
import { cn } from '@/lib/utils';
import { findProducts, type ProductFinderOutput } from '@/ai/flows/product-finder-flow';
import { useTranslation } from 'react-i18next';
import { findSimilarProducts } from '@/utils/productUtils';
import { sendTelegramNotification, formatProductRequestMessage, sendTelegramPhoto, ADMIN_CHAT_ID } from '@/services/telegramService';
import { fetchAllProducts } from '@/services/productService';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image'; // Import Image for telegram.svg
import { db } from '@/lib/firebase/config'; // For Firestore
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { UserDocument } from '@/types';

interface ChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  productLinks?: Array<{ id: string; name: string; href: string }>;
}

export function ChatbotDialog({ open, onOpenChange }: ChatbotDialogProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isAwaitingAdminMessage, setIsAwaitingAdminMessage] = useState(false);
  const [userData, setUserData] = useState<UserDocument | null>(null);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

  // Helper for localization (similar to product-card.tsx)
  const getTranslated = (field: string | { [lang: string]: string }) => {
    if (typeof field === 'string') return field;
    return field[i18n.language] || field['en'] || Object.values(field)[0] || '';
  };

  // Fetch user data when user logs in
  useEffect(() => {
    let unsubscribeUserDoc: Unsubscribe = () => { };
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserDocument);
        } else {
          setUserData(null);
        }
      }, (error) => {
        console.error("Error listening to user document changes in chatbot:", error);
        setUserData(null);
      });
    } else {
      setUserData(null);
    }
    return () => unsubscribeUserDoc();
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Reset state when dialog is closed or opened
  useEffect(() => {
    if (!open) {
      // When dialog closes, reset all states
      setMessages([]);
      setInputValue('');
      setIsLoading(false);
      setShowLoginPrompt(false);
      setIsAwaitingAdminMessage(false);
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    } else {
      // When dialog opens, always start with a fresh chat (empty messages)
      setMessages([]);
      setInputValue('');
      setIsLoading(false);
      setShowLoginPrompt(false);
      setIsAwaitingAdminMessage(false);
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [open]);

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    // Clear the file input value to allow re-selection of the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const userMessageText = inputValue.trim();

    // Block sending if no text and no image, or if currently loading
    if ((!userMessageText && !selectedImageFile) || isLoading) return;

    // If we're awaiting a message for the admin, ensure user is logged in
    if (isAwaitingAdminMessage && !user) {
      setShowLoginPrompt(true);
      setInputValue('');
      handleRemoveImage();
      return;
    }

    const newUserMessage: ChatMessage = { sender: 'user', text: userMessageText };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    if (isAwaitingAdminMessage) {
      // This message is a direct order request for the admin
      try {
        const notificationMessage = formatProductRequestMessage(
          userMessageText,
          user!,
          userData || {},
          [],
          i18n.language
        );

        let sent = false;
        if (selectedImageFile) {
          sent = await sendTelegramPhoto(ADMIN_CHAT_ID, selectedImageFile, notificationMessage);
        } else {
          sent = await sendTelegramNotification(notificationMessage);
        }

        const botMessage: ChatMessage = {
          sender: 'bot',
          text: sent ? t('chatbot.orderSentSuccess') : t('chatbot.orderSentError'),
        };
        setMessages(prev => [...prev, botMessage]);
        setIsAwaitingAdminMessage(false); // Exit this mode after sending
        handleRemoveImage(); // Clear image after sending
      } catch (error) {
        console.error("Error sending direct order request:", error);
        const errorMessage: ChatMessage = {
          sender: 'bot',
          text: t('chatbot.orderSentError')
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Existing AI product finding logic
    try {
      const response: ProductFinderOutput = await findProducts({ query: userMessageText });

      if (!response.foundProducts || response.foundProducts.length === 0) {
        const allProducts = await fetchAllProducts();
        const similarProducts = findSimilarProducts(allProducts, userMessageText);

        let botReplyText = "I couldn't find the exact product you're looking for.";
        if (similarProducts.length > 0) {
          botReplyText += " Would you like to see some similar products? You can also use the 'Open Order' button to contact our team directly.";
        } else {
          botReplyText += " Please try rephrasing your request, or use the 'Open Order' button to contact our team directly.";
        }

        const botMessage: ChatMessage = {
          sender: 'bot',
          text: botReplyText,
          productLinks: similarProducts.length > 0 ? similarProducts.map(p => ({
            id: p.id,
            name: getTranslated(p.name),
            href: `/products/${p.id}`
          })) : undefined,
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        return;
      }

      const botMessage: ChatMessage = {
        sender: 'bot',
        text: response.reply,
        productLinks: response.foundProducts?.map(p => ({
          id: p.id,
          name: getTranslated(p.name),
          href: `/products/${p.id}`
        }))
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: ChatMessage = {
        sender: 'bot',
        text: t('chatbot.errorMessage')
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenOrderRequest = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setIsAwaitingAdminMessage(true);
    setMessages(prev => [...prev, {
      sender: 'bot',
      text: t('chatbot.openOrderPrompt')
    }]);
  };

  const inputPlaceholderText = isAwaitingAdminMessage
    ? "Type your order details for the admin..."
    : t('chatbot.placeholder');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] md:max-w-[600px] flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            {t('chatbot.title')}
          </DialogTitle>
          <DialogDescription>
            {t('chatbot.description')}
          </DialogDescription>
        </DialogHeader>

        {showLoginPrompt && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Please log in to use this feature. <Link href="/auth" className="text-accent hover:underline">Log in now</Link>
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-grow border rounded-md p-4 h-64 min-h-[200px]" viewportRef={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                {t('chatbot.startConversation')}
              </p>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.sender === 'bot' && (
                  <div className="p-2 bg-primary rounded-full text-primary-foreground mt-1 shrink-0">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    msg.sender === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  {msg.productLinks && msg.productLinks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-muted-foreground/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {t('chatbot.viewProducts')}
                      </p>
                      <ul className="space-y-1">
                        {msg.productLinks.map(link => (
                          <li key={link.id}>
                            <Link
                              href={link.href}
                              className="text-sm text-accent hover:underline hover:text-accent/80"
                              onClick={() => onOpenChange(false)}
                            >
                              {link.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Only show 'Open Order' button if similar products are listed. */}
                  {msg.productLinks && msg.productLinks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-muted-foreground/30">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenOrderRequest}
                          disabled={isLoading}
                        >
                          Open Order
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="p-2 bg-accent rounded-full text-accent-foreground mt-1 shrink-0">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <div className="p-2 bg-primary rounded-full text-primary-foreground mt-1 shrink-0">
                  <Bot size={16} />
                </div>
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-secondary text-secondary-foreground">
                  <p className="text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('chatbot.thinking')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {imagePreviewUrl && (
          <div className="relative w-24 h-24 mt-4 mx-auto rounded-md overflow-hidden border border-muted">
            <Image src={imagePreviewUrl} alt="Image Preview" layout="fill" objectFit="cover" />
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={handleRemoveImage}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input
              placeholder={inputPlaceholderText}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-grow"
              disabled={isLoading}
              aria-label={t('chatbot.chatInputAriaLabel')}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            {user && isAwaitingAdminMessage && !selectedImageFile && (
              <Button
                type="button"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                aria-label="Attach Image"
                variant="outline"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}

            {!isAwaitingAdminMessage && (
              <Button
                type="button"
                size="icon"
                onClick={handleOpenOrderRequest}
                disabled={isLoading}
                aria-label="Open Order via Telegram"
                className="flex items-center justify-center bg-gradient-to-r from-teal-400 to-blue-500 text-white hover:from-teal-500 hover:to-blue-600"
              >
                <Image
                  src="/site-assets/brands/telegram.svg"
                  alt="Telegram Icon"
                  width={16}
                  height={16}
                  className="filter invert dark:filter-none"
                />
              </Button>
            )}
            <Button type="submit" size="icon" disabled={isLoading || (!inputValue.trim() && !selectedImageFile)} aria-label={t('chatbot.sendMessageAriaLabel')}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
