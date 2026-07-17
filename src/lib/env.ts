import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  SSO_FEATURE_FLAG: z.string().optional().default("false"),
  EMAIL_FEATURE_FLAG: z.string().optional().default("true"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

function buildEnv() {
  const serverEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SSO_FEATURE_FLAG: process.env.SSO_FEATURE_FLAG,
    EMAIL_FEATURE_FLAG: process.env.EMAIL_FEATURE_FLAG,
  };

  const clientEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const parsedServer = serverSchema.safeParse(serverEnv);
  const parsedClient = clientSchema.safeParse(clientEnv);

  const errors: string[] = [];

  if (!parsedServer.success) {
    for (const issue of parsedServer.error.issues) {
      errors.push(`Server: ${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (!parsedClient.success) {
    for (const issue of parsedClient.error.issues) {
      errors.push(`Client: ${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.join("\n")}`);
  }

  return {
    server: parsedServer.data,
    client: parsedClient.data,
  };
}

export const env = buildEnv();
