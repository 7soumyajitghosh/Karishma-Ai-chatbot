import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tjwxiqaztjmbhtcqyhka.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_EGXOYWfldr8qAgwSwq5_DA_2HL1b9uS";

export const createClient = async (request: any) => {
  // If Next.js NextResponse is available
  let NextResponse: any;
  try {
    const nextServer = await import("next/server");
    NextResponse = nextServer.NextResponse;
  } catch {}

  let supabaseResponse = NextResponse?.next
    ? NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
    : null;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies?.getAll?.() || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }: any) => request.cookies?.set?.(name, value));
          if (NextResponse?.next) {
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }: any) =>
              supabaseResponse?.cookies?.set?.(name, value, options)
            );
          }
        },
      },
    },
  );

  return { supabase, supabaseResponse };
};
