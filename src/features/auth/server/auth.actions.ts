// Phase D stub — Auth actions removed; auth handled via SSO + Cert API (Phase E)
"use server";

export async function loginAction() { throw new Error("Stub: auth removed in Phase D"); }
export async function register() { throw new Error("Stub: auth removed in Phase D"); }
export async function logout() { throw new Error("Stub: auth removed in Phase D"); }
export async function forgotPassword() { throw new Error("Stub: auth removed in Phase D"); }
export async function resetPassword() { throw new Error("Stub: auth removed in Phase D"); }
export async function confirmEmail() { throw new Error("Stub: auth removed in Phase D"); }
export async function getCurrentUser() { return null; }
export async function requestPasswordChange() { throw new Error("Stub: auth removed in Phase D"); }
export async function updatePassword() { throw new Error("Stub: auth removed in Phase D"); }
export async function updateEmail() { throw new Error("Stub: auth removed in Phase D"); }
