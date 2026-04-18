/**
 * Ambient types for Supabase Edge (Deno). Keeps the workspace TS server happy
 * when `supabase/functions` is excluded from the root Expo tsconfig.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): unknown;
};

declare module "https://esm.sh/@supabase/supabase-js@2.49.1" {
  import type { SupabaseClient } from "@supabase/supabase-js";
  import type { SupabaseClientOptions } from "@supabase/supabase-js";

  export function createClient<
    Database = Record<string, never>,
    SchemaName extends string & keyof Database = "public" extends keyof Database
      ? "public"
      : string & keyof Database,
    Schema extends Record<string, unknown> = Database[SchemaName] extends Record<
      string,
      unknown
    >
      ? Database[SchemaName]
      : never,
  >(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions<SchemaName>,
  ): SupabaseClient<Database, SchemaName, Schema>;
}
