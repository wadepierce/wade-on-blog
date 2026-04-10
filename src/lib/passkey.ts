import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

function rpId() {
  const id = process.env.RP_ID;
  if (!id) throw new Error('RP_ID not set');
  return id;
}

function rpOrigin() {
  const origin = process.env.RP_ORIGIN;
  if (!origin) throw new Error('RP_ORIGIN not set');
  return origin;
}

const RP_NAME = 'wade-on-blog';

export async function buildRegistrationOptions(user: { id: string; email: string }) {
  const existing = await db
    .select({ credentialId: schema.passkeys.credentialId })
    .from(schema.passkeys)
    .where(eq(schema.passkeys.userId, user.id));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId(),
    userName: user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: existing.map((c) => ({
      id: Buffer.from(c.credentialId).toString('base64url'),
    })),
  });

  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin(),
    expectedRPID: rpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('registration verification failed');
  }

  const { credential } = verification.registrationInfo;

  await db.insert(schema.passkeys).values({
    userId,
    credentialId: new Uint8Array(Buffer.from(credential.id, 'base64url')),
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: (response.response.transports ?? []) as string[],
  });

  return verification;
}

export async function buildAuthenticationOptions() {
  // Allow any registered passkey (we only have one user anyway)
  const rows = await db
    .select({
      credentialId: schema.passkeys.credentialId,
      transports: schema.passkeys.transports,
    })
    .from(schema.passkeys);

  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: 'preferred',
    allowCredentials: rows.map((r) => ({
      id: Buffer.from(r.credentialId).toString('base64url'),
      transports: (r.transports ?? []) as AuthenticatorTransportFuture[],
    })),
  });

  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
) {
  // credentialId arrives as base64url in response.id
  const credIdBytes = new Uint8Array(Buffer.from(response.id, 'base64url'));

  const rows = await db
    .select()
    .from(schema.passkeys)
    .where(eq(schema.passkeys.credentialId, credIdBytes))
    .limit(1);
  const passkey = rows[0];
  if (!passkey) throw new Error('unknown credential');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin(),
    expectedRPID: rpId(),
    credential: {
      id: Buffer.from(passkey.credentialId).toString('base64url'),
      publicKey: passkey.publicKey,
      counter: Number(passkey.counter),
      transports: (passkey.transports ?? []) as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) {
    throw new Error('authentication verification failed');
  }

  await db
    .update(schema.passkeys)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(schema.passkeys.id, passkey.id));

  return { verification, userId: passkey.userId };
}
