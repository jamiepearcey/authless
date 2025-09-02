import { router, publicProcedure } from "./middleware";
import { z } from "zod";
import { userRouter } from "./routers/user";
import { tenantRouter } from "./routers/tenant";
import { invitationRouter } from "./routers/invitation";
import { twoFactorRouter } from "./routers/twoFactor";
import { contactRouter } from "./routers/contact";
import { passkeyRouter } from "./routers/passkey";
import { notificationRouter } from "./routers/notification";
import { featureToggleRouter } from "./routers/feature-toggle";
import { setupWizardRouter } from "./routers/setup-wizard";
import { authRouter } from "./routers/auth";
import { supportCaseRouter } from "./routers/support-case";
import { supportOptionRouter } from "./routers/support-option";
import { n8nWebhookRouter } from "./routers/n8n-webhook";
import { supportNotificationsRouter } from "./routers/support-notifications";
import { tenantSupportRoutingRouter } from "./routers/tenant-support-routing";
import { tenantSsoRouter } from "./routers/tenant-sso";
import { outboxRouter } from "./routers/outbox";
import { auditRouter } from "./routers/audit";

// Main router that aggregates all feature routers
const appRouter = router({
  // Simple hello endpoint for testing
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input.name}!`,
      };
    }),

  // Authentication
  startPasswordLogin: authRouter.startPasswordLogin,
  send2faCode: authRouter.send2faCode,
  verify2faCode: authRouter.verify2faCode,
  completeAuthentication: authRouter.completeAuthentication,
  getPendingAuthStatus: authRouter.getPendingAuthStatus,
  cancelPendingAuth: authRouter.cancelPendingAuth,

  // User management
  getUser: userRouter.getUser,
  getCurrentUser: userRouter.getCurrentUser,
  updateUser: userRouter.updateUser,
  updateProfilePhoto: userRouter.updateProfilePhoto,
  deleteProfilePhoto: userRouter.deleteProfilePhoto,
  changePassword: userRouter.changePassword,
  deleteUser: userRouter.deleteUser,
  getAllUsers: userRouter.getAllUsers,

  // Tenant management
  createTenant: tenantRouter.createTenant,
  getTenant: tenantRouter.getTenant,
  updateTenant: tenantRouter.updateTenant,
  deleteTenant: tenantRouter.deleteTenant,
  getAllTenants: tenantRouter.getAllTenants,
  getTenants: tenantRouter.getTenants,
  getTenantMemberships: tenantRouter.getTenantMemberships,
  getUserTenants: tenantRouter.getUserTenants,
  getTenantRoles: tenantRouter.getTenantRoles,

  // Tenant SSO Management
  getSsoConfiguration: tenantSsoRouter.getSsoConfiguration,
  upsertSsoConfiguration: tenantSsoRouter.upsertSsoConfiguration,
  testSsoConfiguration: tenantSsoRouter.testSsoConfiguration,
  deleteSsoConfiguration: tenantSsoRouter.deleteSsoConfiguration,
  getSsoAuditLogs: tenantSsoRouter.getSsoAuditLogs,
  getSsoProviders: tenantSsoRouter.getSsoProviders,

  // User invitations and tenant user management
  inviteUser: invitationRouter.inviteUser,
  validateInvitation: invitationRouter.validateInvitation,
  acceptInvitation: invitationRouter.acceptInvitation,
  updateTenantUser: invitationRouter.updateTenantUser,
  resendUserVerification: invitationRouter.resendUserVerification,
  deleteTenantUser: invitationRouter.deleteTenantUser,

  // Two-factor authentication
  generateAuthenticatorCode: twoFactorRouter.generateAuthenticatorCode,
  verifyAndCreateAuthenticatorCode:
    twoFactorRouter.verifyAndCreateAuthenticatorCode,
  getAuthenticatorCodes: twoFactorRouter.getAuthenticatorCodes,
  deleteAuthenticatorCode: twoFactorRouter.deleteAuthenticatorCode,
  verifyAuthenticatorCode: twoFactorRouter.verifyAuthenticatorCode,
  getTwoFactorStatus: twoFactorRouter.getTwoFactorStatus,
  get2fa: twoFactorRouter.get2fa,
  enableWhatsapp2fa: twoFactorRouter.enableWhatsapp2fa,
  verifyWhatsappActivation: twoFactorRouter.verifyWhatsappActivation,
  disableWhatsapp2fa: twoFactorRouter.disableWhatsapp2fa,
  sendTest2faCode: twoFactorRouter.sendTest2faCode,
  migrateLegacyAuthenticators: twoFactorRouter.migrateLegacyAuthenticators,

  // Legacy compatibility methods
  setupTwoFactor: twoFactorRouter.setupTwoFactor,
  verifyTwoFactor: twoFactorRouter.verifyTwoFactor,

  // Contact system (now integrated with support cases)
  getContactReasons: contactRouter.getContactReasons,
  submitContactMessage: contactRouter.submitContactMessage,
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

  // Notification system
  createNotification: notificationRouter.createNotification,
  getUserNotifications: notificationRouter.getUserNotifications,
  getUnreadCount: notificationRouter.getUnreadCount,
  markAsRead: notificationRouter.markAsRead,
  markAllAsRead: notificationRouter.markAllAsRead,
  archiveNotification: notificationRouter.archiveNotification,
  getAllNotifications: notificationRouter.getAllNotifications,
  updateNotification: notificationRouter.updateNotification,
  deleteNotification: notificationRouter.deleteNotification,
  batchDeleteNotifications: notificationRouter.batchDeleteNotifications,
  createWebhookEndpoint: notificationRouter.createWebhookEndpoint,
  getWebhookEndpoints: notificationRouter.getWebhookEndpoints,
  updateWebhookEndpoint: notificationRouter.updateWebhookEndpoint,
  deleteWebhookEndpoint: notificationRouter.deleteWebhookEndpoint,

  // Real-time notifications (Centrifugo)
  getCentrifugoToken: notificationRouter.getCentrifugoToken,
  subscribeToNotifications: notificationRouter.subscribeToNotifications,

  // Feature Toggle System
  getEffectiveFeatures: featureToggleRouter.getEffectiveFeatures,
  isFeatureEnabled: featureToggleRouter.isFeatureEnabled,
  createFeatureDefinition: featureToggleRouter.createFeatureDefinition,
  updateFeatureDefinition: featureToggleRouter.updateFeatureDefinition,
  deleteFeatureDefinition: featureToggleRouter.deleteFeatureDefinition,
  listFeatureDefinitions: featureToggleRouter.listFeatureDefinitions,
  setGlobalFeatureRule: featureToggleRouter.setGlobalFeatureRule,
  removeGlobalFeatureRule: featureToggleRouter.removeGlobalFeatureRule,
  getGlobalAuditHistory: featureToggleRouter.getGlobalAuditHistory,
  getTenantFeatures: featureToggleRouter.getTenantFeatures,
  setTenantFeatureRule: featureToggleRouter.setTenantFeatureRule,
  removeTenantFeatureRule: featureToggleRouter.removeTenantFeatureRule,
  getTenantAuditHistory: featureToggleRouter.getTenantAuditHistory,

  // Setup Wizard
  getSetupState: setupWizardRouter.getSetupState,
  updateWizardStep: setupWizardRouter.updateWizardStep,
  submitDatabaseConfig: setupWizardRouter.submitDatabaseConfig,
  createFirstAdmin: setupWizardRouter.createFirstAdmin,
  submitFeatureSelections: setupWizardRouter.submitFeatureSelections,
  completeSetup: setupWizardRouter.completeSetup,
  isSetupRequired: setupWizardRouter.isSetupRequired,
  getCoreFeatures: setupWizardRouter.getCoreFeatures,
  resetSetup: setupWizardRouter.resetSetup,

  // Support Resolution Center - Cases
  getAllCases: supportCaseRouter.getAllCases,
  getCaseByCaseNumber: supportCaseRouter.getCaseByCaseNumber,

  createCase: supportCaseRouter.createCase,
  updateCaseStatus: supportCaseRouter.updateCaseStatus,
  assignCase: supportCaseRouter.assignCase,
  addCaseMessage: supportCaseRouter.addCaseMessage,
  getCaseMessages: supportCaseRouter.getCaseMessages,
  getCaseMetrics: supportCaseRouter.getCaseMetrics,
  convertContactMessageToCase: supportCaseRouter.convertContactMessageToCase,
  processEmailReply: supportCaseRouter.processEmailReply,

  // Support Resolution Center - Options
  getGlobalSupportOptions: supportOptionRouter.getGlobalSupportOptions,
  createGlobalSupportOption: supportOptionRouter.createGlobalSupportOption,
  updateGlobalSupportOption: supportOptionRouter.updateGlobalSupportOption,
  deleteGlobalSupportOption: supportOptionRouter.deleteGlobalSupportOption,
  getTenantSupportOptions: supportOptionRouter.getTenantSupportOptions,
  createTenantSupportOption: supportOptionRouter.createTenantSupportOption,
  updateTenantSupportOption: supportOptionRouter.updateTenantSupportOption,
  deleteTenantSupportOption: supportOptionRouter.deleteTenantSupportOption,
  getAvailableSupportOptions: supportOptionRouter.getAvailableSupportOptions,
  testSupportOptionRouting: supportOptionRouter.testSupportOptionRouting,

  // Support Resolution Center - n8n Integration
  receiveInboundMessage: n8nWebhookRouter.receiveInboundMessage,
  sendOutboundMessage: n8nWebhookRouter.sendOutboundMessage,
  updateDeliveryStatus: n8nWebhookRouter.updateDeliveryStatus,
  configureN8nWebhooks: n8nWebhookRouter.configureN8nWebhooks,
  getN8nConfiguration: n8nWebhookRouter.getN8nConfiguration,

  // Support Resolution Center - Notifications
  createSupportNotification:
    supportNotificationsRouter.createSupportNotification,
  getUserSupportNotificationPreferences:
    supportNotificationsRouter.getUserSupportNotificationPreferences,
  updateUserSupportNotificationPreferences:
    supportNotificationsRouter.updateUserSupportNotificationPreferences,
  notifyCaseParticipants: supportNotificationsRouter.notifyCaseParticipants,

  // Tenant Support Routing
  getTenantSupportRouting: tenantSupportRoutingRouter.getTenantSupportRouting,
  upsertTenantSupportRouting:
    tenantSupportRoutingRouter.upsertTenantSupportRouting,
  bulkUpdateTenantSupportRouting:
    tenantSupportRoutingRouter.bulkUpdateTenantSupportRouting,
  getTenantAvailableEmails: tenantSupportRoutingRouter.getTenantAvailableEmails,
  deleteTenantSupportRouting:
    tenantSupportRoutingRouter.deleteTenantSupportRouting,

  // Outbox Event Management (Platform Admin)
  getOutboxStats: outboxRouter.getStats,
  getOutboxEvents: outboxRouter.getEvents,
  getOutboxEventById: outboxRouter.getEventById,
  retryFailedEvents: outboxRouter.retryFailedEvents,
  resetStuckEvents: outboxRouter.resetStuckEvents,
  cleanupProcessedEvents: outboxRouter.cleanupProcessedEvents,
  getEventsByTenant: outboxRouter.getEventsByTenant,
  getEventsByType: outboxRouter.getEventsByType,
  getOutboxEventTypes: outboxRouter.getEventTypes,
  getOutboxTenantIds: outboxRouter.getTenantIds,

  // Audit Event Management (Platform Admin & Tenant Admin)
  getAuditEvents: auditRouter.getAuditEvents,
  getTenantAuditEvents: auditRouter.getTenantAuditEvents,
  getAuditStats: auditRouter.getAuditStats,
  getAuditFilterOptions: auditRouter.getFilterOptions,
  getAuditEventById: auditRouter.getAuditEventById,
});

// Export the router and type for client usage
export { appRouter };
export type AppRouter = typeof appRouter;
