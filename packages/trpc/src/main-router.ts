import { router, publicProcedure } from "./base";
import { z } from "zod";
import { userRouter } from "./routers/user";
import { tenantRouter } from "./routers/tenant";
import { invitationRouter } from "./routers/invitation";
import { twoFactorRouter } from "./routers/twoFactor";
import { contactRouter } from "./routers/contact";
import { passkeyRouter } from "./routers/passkey";

// Main router that aggregates all feature routers
export const appRouter = router({
  // Simple hello endpoint for testing
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input.name}!`,
      };
    }),
  
  // User management
  getUser: userRouter.getUser,
  getCurrentUser: userRouter.getCurrentUser,
  updateUser: userRouter.updateUser,
  deleteUser: userRouter.deleteUser,
  
  // Tenant management
  createTenant: tenantRouter.createTenant,
  getTenant: tenantRouter.getTenant,
  updateTenant: tenantRouter.updateTenant,
  deleteTenant: tenantRouter.deleteTenant,
  getAllTenants: tenantRouter.getAllTenants,
  getTenants: tenantRouter.getTenants,
  getTenantMemberships: tenantRouter.getTenantMemberships,
  getUserTenants: tenantRouter.getUserTenants,
  
  // User invitations and tenant user management
  inviteUser: invitationRouter.inviteUser,
  validateInvitation: invitationRouter.validateInvitation,
  acceptInvitation: invitationRouter.acceptInvitation,
  updateTenantUser: invitationRouter.updateTenantUser,
  resendUserVerification: invitationRouter.resendUserVerification,
  deleteTenantUser: invitationRouter.deleteTenantUser,
  
  // Two-factor authentication
  generateAuthenticatorCode: twoFactorRouter.generateAuthenticatorCode,
  verifyAndCreateAuthenticatorCode: twoFactorRouter.verifyAndCreateAuthenticatorCode,
  getAuthenticatorCodes: twoFactorRouter.getAuthenticatorCodes,
  deleteAuthenticatorCode: twoFactorRouter.deleteAuthenticatorCode,
  verifyAuthenticatorCode: twoFactorRouter.verifyAuthenticatorCode,
  getTwoFactorStatus: twoFactorRouter.getTwoFactorStatus,
  
  // Contact system
  getContactReasons: contactRouter.getContactReasons,
  submitContactMessage: contactRouter.submitContactMessage,
  createContactMessage: contactRouter.createContactMessage,
  getContactMessage: contactRouter.getContactMessage,
  getUserContactMessages: contactRouter.getUserContactMessages,
  addContactReply: contactRouter.addContactReply,
  updateContactMessageStatus: contactRouter.updateContactMessageStatus,
  
  // Passkey system
  getRegistrationOptions: passkeyRouter.getRegistrationOptions,
  registerPasskey: passkeyRouter.registerPasskey,
  getAuthenticationOptions: passkeyRouter.getAuthenticationOptions,
  authenticatePasskey: passkeyRouter.authenticatePasskey,
  getUserPasskeys: passkeyRouter.getUserPasskeys,
  revokePasskey: passkeyRouter.revokePasskey,
  getAccountsWithPasskeys: passkeyRouter.getAccountsWithPasskeys,
  getAvailableAccounts: passkeyRouter.getAvailableAccounts,
});

// Export type for client usage
export type AppRouter = typeof appRouter;
