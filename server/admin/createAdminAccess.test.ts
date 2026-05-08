import { afterEach, describe, expect, it } from "vitest";
import { createAdminAccess } from "./createAdminAccess";

const originalLocalAdminEmail = process.env.LOCAL_ADMIN_EMAIL;
const originalLocalAdminEmails = process.env.LOCAL_ADMIN_EMAILS;

afterEach(() => {
  process.env.LOCAL_ADMIN_EMAIL = originalLocalAdminEmail;
  process.env.LOCAL_ADMIN_EMAILS = originalLocalAdminEmails;
});

describe("createAdminAccess", () => {
  it("allows env email override", async () => {
    process.env.LOCAL_ADMIN_EMAIL = "Ada@Example.com";
    process.env.LOCAL_ADMIN_EMAILS = "";

    const adminAccess = createAdminAccess(null);

    await expect(adminAccess.isAdminEmail("ada@example.com")).resolves.toBe(true);
  });

  it("checks administrators documents by normalized email", async () => {
    process.env.LOCAL_ADMIN_EMAIL = "";
    process.env.LOCAL_ADMIN_EMAILS = "";

    const db = {
      collection: () => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: id === "grace@example.com"
          })
        }),
        where: () => ({
          limit: () => ({
            get: async () => ({
              empty: true
            })
          })
        })
      })
    };

    const adminAccess = createAdminAccess(db as never);

    await expect(adminAccess.isAdminEmail(" Grace@Example.com ")).resolves.toBe(true);
  });
});
