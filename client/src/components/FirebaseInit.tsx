"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase";

export function FirebaseInit() {
  useEffect(() => {
    getFirebaseAnalytics();
  }, []);
  return null;
}
