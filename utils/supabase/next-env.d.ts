declare module "next/headers" {
  export function cookies(): Promise<any> | any;
}

declare module "next/server" {
  export interface NextRequest {
    cookies: any;
    headers: any;
    [key: string]: any;
  }
  export class NextResponse {
    static next(options?: any): any;
    cookies: any;
    [key: string]: any;
  }
}
