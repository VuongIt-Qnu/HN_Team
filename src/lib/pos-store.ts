'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';
import { createCartLine, createOrderTab, POS_UNKNOWN_CUSTOMER, type OrderTab } from './pos-types';

/**
 * Gio hang POS da don (Multi-tab Orders) + Offline-First:
 * gio hang duoc luu vao localStorage, mat mang van giu nguyen du lieu,
 * khi co mang tro lai chi can bam Thanh toan (F12).
 */

interface PosState {
  tabs: OrderTab[];
  activeTabId: string;
  counter: number;
  addTab: () => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, patch: Partial<OrderTab>) => void;
  addProduct: (tabId: string, product: Product, quantity?: number) => void;
  setQuantity: (tabId: string, lineId: string, quantity: number) => void;
  bumpQuantity: (tabId: string, lineId: string, delta: number) => void;
  setLinePrice: (tabId: string, lineId: string, price: number) => void;
  setLineDiscount: (tabId: string, lineId: string, discount: number) => void;
  removeLine: (tabId: string, lineId: string) => void;
  clearTab: (tabId: string) => void;
  resetAll: () => void;
}

const firstTab = createOrderTab(1);

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      tabs: [firstTab],
      activeTabId: firstTab.tabId,
      counter: 1,

      addTab: () => {
        const counter = get().counter + 1;
        const tab = createOrderTab(counter);
        set({ tabs: [...get().tabs, tab], activeTabId: tab.tabId, counter });
        return tab.tabId;
      },

      closeTab: (tabId) => {
        const remaining = get().tabs.filter((tab) => tab.tabId !== tabId);
        if (remaining.length === 0) {
          const counter = get().counter + 1;
          const tab = createOrderTab(counter);
          set({ tabs: [tab], activeTabId: tab.tabId, counter });
          return;
        }
        set({
          tabs: remaining,
          activeTabId: get().activeTabId === tabId ? remaining[remaining.length - 1].tabId : get().activeTabId,
        });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      updateTab: (tabId, patch) =>
        set({ tabs: get().tabs.map((tab) => (tab.tabId === tabId ? { ...tab, ...patch } : tab)) }),

      addProduct: (tabId, product, quantity = 1) =>
        set({
          tabs: get().tabs.map((tab) => {
            if (tab.tabId !== tabId) return tab;
            const existing = tab.lines.find((line) => line.productId === product.id);
            if (existing) {
              return {
                ...tab,
                lines: tab.lines.map((line) =>
                  line.productId === product.id ? { ...line, quantity: line.quantity + quantity } : line,
                ),
              };
            }
            return {
              ...tab,
              lines: [
                ...tab.lines,
                createCartLine({
                  productId: product.id,
                  sku: product.sku,
                  barcode: product.barcode,
                  name: product.name,
                  unit: product.unit,
                  basePrice: product.sellPrice,
                  unitPrice: product.sellPrice,
                  quantity,
                  discount: 0,
                  stock: product.stock,
                }),
              ],
            };
          }),
        }),

      setQuantity: (tabId, lineId, quantity) =>
        set({
          tabs: get().tabs.map((tab) =>
            tab.tabId === tabId
              ? {
                  ...tab,
                  lines: tab.lines
                    .map((line) => (line.lineId === lineId ? { ...line, quantity } : line))
                    .filter((line) => line.quantity > 0),
                }
              : tab,
          ),
        }),

      bumpQuantity: (tabId, lineId, delta) => {
        const line = get()
          .tabs.find((tab) => tab.tabId === tabId)
          ?.lines.find((item) => item.lineId === lineId);
        if (!line) return;
        get().setQuantity(tabId, lineId, Math.max(0, line.quantity + delta));
      },

      setLinePrice: (tabId, lineId, price) =>
        set({
          tabs: get().tabs.map((tab) =>
            tab.tabId === tabId
              ? {
                  ...tab,
                  lines: tab.lines.map((line) => (line.lineId === lineId ? { ...line, unitPrice: price } : line)),
                }
              : tab,
          ),
        }),

      setLineDiscount: (tabId, lineId, discount) =>
        set({
          tabs: get().tabs.map((tab) =>
            tab.tabId === tabId
              ? {
                  ...tab,
                  lines: tab.lines.map((line) => (line.lineId === lineId ? { ...line, discount } : line)),
                }
              : tab,
          ),
        }),

      removeLine: (tabId, lineId) =>
        set({
          tabs: get().tabs.map((tab) =>
            tab.tabId === tabId ? { ...tab, lines: tab.lines.filter((line) => line.lineId !== lineId) } : tab,
          ),
        }),

      clearTab: (tabId) =>
        set({
          tabs: get().tabs.map((tab) =>
            tab.tabId === tabId
              ? {
                  ...tab,
                  lines: [],
                  orderDiscount: 0,
                  paidAmount: 0,
                  note: '',
                  customerId: undefined,
                  customerName: POS_UNKNOWN_CUSTOMER,
                  paymentMethod: 'CASH',
                  technicianId: undefined,
                  technicianName: undefined,
                  deliveryAddress: undefined,
                }
              : tab,
          ),
        }),

      resetAll: () => {
        const counter = get().counter + 1;
        const tab = createOrderTab(counter);
        set({ tabs: [tab], activeTabId: tab.tabId, counter });
      },
    }),
    { name: 'hn-pos-cart-v1' },
  ),
);
