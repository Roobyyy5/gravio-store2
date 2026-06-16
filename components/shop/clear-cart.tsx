"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

/** Empties the persisted cart once a checkout session has completed. */
export function ClearCartOnMount() {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);

  return null;
}
