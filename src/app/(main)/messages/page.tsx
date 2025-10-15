
"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return; // Wait for Firestore to be initialized
    console.log("Firestore ready?", !!db)


    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(docs);
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !firestore) return;
    await addDoc(collection(db, "messages"), {
      text,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 border-b">
        <div ref={scrollRef} className="p-4 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded bg-muted p-2">
              {m.text}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={send} className="flex gap-2 p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type..."
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
