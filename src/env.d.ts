/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: {
      userId: string;
      email: string;
      name: string;
      role: 'admin' | 'user';
      createdAt: number;
      lastActivity: number;
    };
    user?: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'user';
    };
  }
}
