import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// JWT utilities for email verification and password reset
export function generateEmailVerificationToken(userId: string, email: string, jwtSecret: string): string {
  const payload = {
    userId,
    email,
    type: "email-verification",
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };
  
  return jwt.sign(payload, jwtSecret);
}

export function generatePasswordResetToken(userId: string, email: string, jwtSecret: string): string {
  const payload = {
    userId,
    email,
    type: "password-reset",
    exp: Math.floor(Date.now() / 1000) + (1 * 60 * 60), // 1 hour
  };
  
  return jwt.sign(payload, jwtSecret);
}

export function verifyToken(token: string, jwtSecret: string): any {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

export function generateRandomToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
