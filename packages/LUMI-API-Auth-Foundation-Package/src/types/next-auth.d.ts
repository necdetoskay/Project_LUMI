import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      roles: string[];
      name?: string | null;
      image?: string | null;
    };
  }
}
