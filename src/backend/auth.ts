import { NextRequest } from "next/server";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

import {
  consumeAuthChallenge,
  createAuthChallenge,
  getAuthToken,
  issueAuthToken,
  WalletAuthChallenge
} from "@/backend/state";
import { env } from "@/lib/env";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function issueWalletChallenge(walletAddress: string): WalletAuthChallenge {
  return createAuthChallenge(walletAddress);
}

export function verifyWalletChallenge(input: {
  walletAddress: string;
  challengeId: string;
  signatureBase64: string;
}): { token: string; expiresAt: string } {
  const challenge = consumeAuthChallenge(input.challengeId, input.walletAddress);
  if (!challenge) {
    throw new AuthError("Invalid or expired challenge", 401);
  }

  let signatureBytes: Uint8Array;
  let publicKeyBytes: Uint8Array;

  try {
    signatureBytes = Buffer.from(input.signatureBase64, "base64");
    publicKeyBytes = new PublicKey(input.walletAddress).toBytes();
  } catch {
    throw new AuthError("Invalid wallet or signature encoding", 400);
  }

  const messageBytes = new TextEncoder().encode(challenge.message);
  const ok = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  if (!ok) {
    throw new AuthError("Signature verification failed", 401);
  }

  const auth = issueAuthToken(input.walletAddress);
  return {
    token: auth.token,
    expiresAt: auth.expiresAt
  };
}

export function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;

  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  return trimmed.slice(7).trim();
}

export function requireAuth(req: NextRequest, expectedWalletAddress?: string): { walletAddress: string } {
  if (!env.requireWalletAuth) {
    return {
      walletAddress: expectedWalletAddress ?? ""
    };
  }

  const token = extractBearerToken(req);
  if (!token) {
    throw new AuthError("Missing bearer auth token", 401);
  }

  const auth = getAuthToken(token);
  if (!auth) {
    throw new AuthError("Invalid or expired auth token", 401);
  }

  if (expectedWalletAddress && auth.walletAddress !== expectedWalletAddress) {
    throw new AuthError("Auth token wallet mismatch", 403);
  }

  return {
    walletAddress: auth.walletAddress
  };
}
