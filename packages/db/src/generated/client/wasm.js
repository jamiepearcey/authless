
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  tenantId: 'tenantId',
  expires: 'expires'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  hashedPassword: 'hashedPassword',
  isEmailVerified: 'isEmailVerified',
  emailVerificationToken: 'emailVerificationToken',
  passwordResetToken: 'passwordResetToken',
  passwordResetExpires: 'passwordResetExpires',
  platformRole: 'platformRole',
  status: 'status',
  lastLoginAt: 'lastLoginAt',
  twoFactorSecret: 'twoFactorSecret',
  twoFactorEnabled: 'twoFactorEnabled',
  bio: 'bio',
  location: 'location',
  website: 'website',
  timezone: 'timezone',
  locale: 'locale',
  emailNotifications: 'emailNotifications',
  marketingEmails: 'marketingEmails',
  securityAlerts: 'securityAlerts',
  activityUpdates: 'activityUpdates',
  notifySupportRepliesUI: 'notifySupportRepliesUI',
  notifySupportRepliesEmail: 'notifySupportRepliesEmail',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  status: 'status',
  subdomain: 'subdomain',
  customDomain: 'customDomain',
  logoUrl: 'logoUrl',
  theme: 'theme',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  invitePolicy: 'invitePolicy',
  emailVerificationBypassEnabled: 'emailVerificationBypassEnabled',
  locale: 'locale',
  timezone: 'timezone',
  plan: 'plan',
  limits: 'limits',
  featureFlags: 'featureFlags',
  ssoEnabled: 'ssoEnabled',
  ssoProvider: 'ssoProvider',
  billingEnabled: 'billingEnabled',
  stripeCustomerId: 'stripeCustomerId',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  description: 'description',
  website: 'website',
  industry: 'industry',
  size: 'size',
  contactEmail: 'contactEmail',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  suspendedAt: 'suspendedAt',
  deletedAt: 'deletedAt',
  domainAlias: 'domainAlias',
  registrationClosed: 'registrationClosed'
};

exports.Prisma.TenantSsoConfigurationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  provider: 'provider',
  providerName: 'providerName',
  isEnabled: 'isEnabled',
  enforceSSO: 'enforceSSO',
  samlEntityId: 'samlEntityId',
  samlSsoUrl: 'samlSsoUrl',
  samlSloUrl: 'samlSloUrl',
  samlCertificate: 'samlCertificate',
  samlSigningCert: 'samlSigningCert',
  samlNameIdFormat: 'samlNameIdFormat',
  samlAttributeMapping: 'samlAttributeMapping',
  oidcIssuer: 'oidcIssuer',
  oidcClientId: 'oidcClientId',
  oidcClientSecret: 'oidcClientSecret',
  oidcScopes: 'oidcScopes',
  oidcTokenEndpoint: 'oidcTokenEndpoint',
  oidcAuthEndpoint: 'oidcAuthEndpoint',
  oidcUserinfoEndpoint: 'oidcUserinfoEndpoint',
  oidcJwksUri: 'oidcJwksUri',
  oauth2ClientId: 'oauth2ClientId',
  oauth2ClientSecret: 'oauth2ClientSecret',
  oauth2AuthUrl: 'oauth2AuthUrl',
  oauth2TokenUrl: 'oauth2TokenUrl',
  oauth2UserInfoUrl: 'oauth2UserInfoUrl',
  oauth2Scopes: 'oauth2Scopes',
  autoProvisionUsers: 'autoProvisionUsers',
  defaultRole: 'defaultRole',
  allowedDomains: 'allowedDomains',
  userAttributeMapping: 'userAttributeMapping',
  signAssertions: 'signAssertions',
  signRequests: 'signRequests',
  encryptAssertions: 'encryptAssertions',
  sessionTimeout: 'sessionTimeout',
  lastSyncAt: 'lastSyncAt',
  lastLoginAt: 'lastLoginAt',
  totalLogins: 'totalLogins',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy',
  updatedBy: 'updatedBy'
};

exports.Prisma.SsoAuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  event: 'event',
  provider: 'provider',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  samlRequestId: 'samlRequestId',
  samlResponseId: 'samlResponseId',
  errorMessage: 'errorMessage',
  attributes: 'attributes',
  sessionId: 'sessionId',
  createdAt: 'createdAt'
};

exports.Prisma.MembershipScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  role: 'role',
  status: 'status',
  permissions: 'permissions',
  invitedByUserId: 'invitedByUserId',
  invitationAcceptedAt: 'invitationAcceptedAt',
  lastActiveAt: 'lastActiveAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvitationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  role: 'role',
  token: 'token',
  expiresAt: 'expiresAt',
  bypassEmailVerification: 'bypassEmailVerification',
  status: 'status',
  message: 'message',
  acceptedAt: 'acceptedAt',
  acceptedByUserId: 'acceptedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  invitedByUserId: 'invitedByUserId'
};

exports.Prisma.ContactReasonScalarFieldEnum = {
  id: 'id',
  key: 'key',
  label: 'label',
  description: 'description',
  icon: 'icon',
  helpType: 'helpType',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactMessageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  subject: 'subject',
  message: 'message',
  userId: 'userId',
  tenantId: 'tenantId',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  assignedTo: 'assignedTo',
  category: 'category',
  dueDate: 'dueDate',
  resolvedAt: 'resolvedAt',
  tags: 'tags'
};

exports.Prisma.ContactMessageReasonScalarFieldEnum = {
  id: 'id',
  contactMessageId: 'contactMessageId',
  contactReasonId: 'contactReasonId',
  createdAt: 'createdAt'
};

exports.Prisma.ContactReplyScalarFieldEnum = {
  id: 'id',
  contactMessageId: 'contactMessageId',
  message: 'message',
  isFromUser: 'isFromUser',
  isInternal: 'isInternal',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  resourceType: 'resourceType',
  resourceId: 'resourceId',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  metadata: 'metadata',
  severity: 'severity',
  createdAt: 'createdAt',
  traceId: 'traceId'
};

exports.Prisma.PasskeyScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  credentialId: 'credentialId',
  publicKey: 'publicKey',
  signCount: 'signCount',
  transports: 'transports',
  backupEligible: 'backupEligible',
  backupState: 'backupState',
  userVerification: 'userVerification',
  rpId: 'rpId',
  isActive: 'isActive',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuthenticatorCodeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  secret: 'secret',
  isActive: 'isActive',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  type: 'type',
  priority: 'priority',
  status: 'status',
  tenantId: 'tenantId',
  role: 'role',
  userId: 'userId',
  metadata: 'metadata',
  dataJson: 'dataJson',
  isAlert: 'isAlert',
  emailOnly: 'emailOnly',
  templateId: 'templateId',
  templateVariables: 'templateVariables',
  expiresAt: 'expiresAt',
  readAt: 'readAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationRecipientScalarFieldEnum = {
  id: 'id',
  notificationId: 'notificationId',
  userId: 'userId',
  status: 'status',
  readAt: 'readAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookEndpointScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  url: 'url',
  secret: 'secret',
  events: 'events',
  isActive: 'isActive',
  lastTriggeredAt: 'lastTriggeredAt',
  failureCount: 'failureCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeatureDefinitionScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  description: 'description',
  tier: 'tier',
  defaultEnabled: 'defaultEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.GlobalFeatureRuleScalarFieldEnum = {
  id: 'id',
  featureKey: 'featureKey',
  enabled: 'enabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.TenantFeatureRuleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  featureKey: 'featureKey',
  enabled: 'enabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.FeatureAuditEntryScalarFieldEnum = {
  id: 'id',
  featureKey: 'featureKey',
  scope: 'scope',
  tenantId: 'tenantId',
  beforeValue: 'beforeValue',
  afterValue: 'afterValue',
  action: 'action',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.SetupStateScalarFieldEnum = {
  id: 'id',
  isCompleted: 'isCompleted',
  currentStep: 'currentStep',
  contextSnapshot: 'contextSnapshot',
  completedAt: 'completedAt',
  completedBy: 'completedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TwoFactorMethodScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  type: 'type',
  identifier: 'identifier',
  secret: 'secret',
  isVerified: 'isVerified',
  isEnabled: 'isEnabled',
  backupCodes: 'backupCodes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastUsedAt: 'lastUsedAt'
};

exports.Prisma.PendingAuthScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  nonce: 'nonce',
  requiredFactors: 'requiredFactors',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent'
};

exports.Prisma.TwoFactorCodeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  type: 'type',
  codeHash: 'codeHash',
  salt: 'salt',
  purpose: 'purpose',
  attempts: 'attempts',
  maxAttempts: 'maxAttempts',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  traceId: 'traceId'
};

exports.Prisma.TwoFactorAuditScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  action: 'action',
  factorType: 'factorType',
  success: 'success',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.SupportCaseScalarFieldEnum = {
  id: 'id',
  contactMessageId: 'contactMessageId',
  caseNumberSeq: 'caseNumberSeq',
  caseNumber: 'caseNumber',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  assigneeId: 'assigneeId',
  tenantId: 'tenantId',
  supportOptionId: 'supportOptionId',
  threadingKey: 'threadingKey',
  source: 'source',
  sourceMetadata: 'sourceMetadata',
  firstResponseAt: 'firstResponseAt',
  resolvedAt: 'resolvedAt',
  closedAt: 'closedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportOptionScalarFieldEnum = {
  id: 'id',
  key: 'key',
  label: 'label',
  description: 'description',
  icon: 'icon',
  isActive: 'isActive',
  isGlobal: 'isGlobal',
  tenantId: 'tenantId',
  parentOptionId: 'parentOptionId',
  sortOrder: 'sortOrder',
  isHidden: 'isHidden',
  routingConfig: 'routingConfig',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CaseMessageScalarFieldEnum = {
  id: 'id',
  caseId: 'caseId',
  contactReplyId: 'contactReplyId',
  direction: 'direction',
  channel: 'channel',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  subject: 'subject',
  content: 'content',
  isInternal: 'isInternal',
  messageId: 'messageId',
  threadingData: 'threadingData',
  attachments: 'attachments',
  deliveryStatus: 'deliveryStatus',
  deliveryMetadata: 'deliveryMetadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CaseStatusHistoryScalarFieldEnum = {
  id: 'id',
  caseId: 'caseId',
  fromStatus: 'fromStatus',
  toStatus: 'toStatus',
  changedBy: 'changedBy',
  reason: 'reason',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.CaseMetricsScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  date: 'date',
  supportOptionId: 'supportOptionId',
  assigneeId: 'assigneeId',
  totalCases: 'totalCases',
  openCases: 'openCases',
  pendingCases: 'pendingCases',
  resolvedCases: 'resolvedCases',
  closedCases: 'closedCases',
  avgFirstResponseTime: 'avgFirstResponseTime',
  avgResolutionTime: 'avgResolutionTime',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportConfigurationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  key: 'key',
  value: 'value',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantSupportRoutingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  helpType: 'helpType',
  email: 'email',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OutboxEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  aggregateType: 'aggregateType',
  aggregateId: 'aggregateId',
  tenantId: 'tenantId',
  payloadJson: 'payloadJson',
  idempotencyKey: 'idempotencyKey',
  status: 'status',
  tries: 'tries',
  nextAttemptAt: 'nextAttemptAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastError: 'lastError',
  traceId: 'traceId'
};

exports.Prisma.EmailProviderScalarFieldEnum = {
  id: 'id',
  type: 'type',
  enabled: 'enabled',
  isDefault: 'isDefault',
  fromName: 'fromName',
  fromEmail: 'fromEmail',
  replyToEmail: 'replyToEmail',
  config: 'config',
  isConnected: 'isConnected',
  lastTested: 'lastTested',
  lastTestResult: 'lastTestResult',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.AuditEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  eventName: 'eventName',
  tenantId: 'tenantId',
  userId: 'userId',
  aggregateType: 'aggregateType',
  aggregateId: 'aggregateId',
  timestamp: 'timestamp',
  sourceService: 'sourceService',
  sourceVersion: 'sourceVersion',
  sourceHost: 'sourceHost',
  requestId: 'requestId',
  correlationId: 'correlationId',
  actorType: 'actorType',
  actorId: 'actorId',
  actorName: 'actorName',
  actorEmail: 'actorEmail',
  actorIpAddress: 'actorIpAddress',
  actorUserAgent: 'actorUserAgent',
  resourceType: 'resourceType',
  resourceId: 'resourceId',
  resourceName: 'resourceName',
  resourceAttributes: 'resourceAttributes',
  actionType: 'actionType',
  actionDescription: 'actionDescription',
  actionOutcome: 'actionOutcome',
  actionReason: 'actionReason',
  metadata: 'metadata',
  originalPayload: 'originalPayload',
  createdAt: 'createdAt',
  traceId: 'traceId'
};

exports.Prisma.InboxEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  aggregateType: 'aggregateType',
  aggregateId: 'aggregateId',
  tenantId: 'tenantId',
  payloadJson: 'payloadJson',
  idempotencyKey: 'idempotencyKey',
  status: 'status',
  tries: 'tries',
  nextAttemptAt: 'nextAttemptAt',
  createdAt: 'createdAt',
  lastError: 'lastError',
  traceId: 'traceId',
  source: 'source',
  sourceId: 'sourceId'
};

exports.Prisma.NotificationIntentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  recipients: 'recipients',
  payloadJson: 'payloadJson',
  createdAt: 'createdAt',
  processedAt: 'processedAt',
  status: 'status',
  errorMessage: 'errorMessage',
  retryCount: 'retryCount',
  maxRetries: 'maxRetries',
  traceId: 'traceId',
  idempotencyKey: 'idempotencyKey',
  expiresAt: 'expiresAt'
};

exports.Prisma.NotificationDeliveryScalarFieldEnum = {
  id: 'id',
  notificationId: 'notificationId',
  channel: 'channel',
  status: 'status',
  tries: 'tries',
  maxTries: 'maxTries',
  lastError: 'lastError',
  sentAt: 'sentAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  metadata: 'metadata'
};

exports.Prisma.NotificationPreferencesScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  type: 'type',
  channels: 'channels',
  emailEnabled: 'emailEnabled',
  realtimeEnabled: 'realtimeEnabled',
  smsEnabled: 'smsEnabled',
  whatsappEnabled: 'whatsappEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: 'id',
  type: 'type',
  locale: 'locale',
  subject: 'subject',
  html: 'html',
  text: 'text',
  variables: 'variables',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Account: 'Account',
  Session: 'Session',
  User: 'User',
  VerificationToken: 'VerificationToken',
  Tenant: 'Tenant',
  TenantSsoConfiguration: 'TenantSsoConfiguration',
  SsoAuditLog: 'SsoAuditLog',
  Membership: 'Membership',
  Invitation: 'Invitation',
  ContactReason: 'ContactReason',
  ContactMessage: 'ContactMessage',
  ContactMessageReason: 'ContactMessageReason',
  ContactReply: 'ContactReply',
  AuditLog: 'AuditLog',
  Passkey: 'Passkey',
  AuthenticatorCode: 'AuthenticatorCode',
  Notification: 'Notification',
  NotificationRecipient: 'NotificationRecipient',
  WebhookEndpoint: 'WebhookEndpoint',
  FeatureDefinition: 'FeatureDefinition',
  GlobalFeatureRule: 'GlobalFeatureRule',
  TenantFeatureRule: 'TenantFeatureRule',
  FeatureAuditEntry: 'FeatureAuditEntry',
  SetupState: 'SetupState',
  TwoFactorMethod: 'TwoFactorMethod',
  PendingAuth: 'PendingAuth',
  TwoFactorCode: 'TwoFactorCode',
  TwoFactorAudit: 'TwoFactorAudit',
  SupportCase: 'SupportCase',
  SupportOption: 'SupportOption',
  CaseMessage: 'CaseMessage',
  CaseStatusHistory: 'CaseStatusHistory',
  CaseMetrics: 'CaseMetrics',
  SupportConfiguration: 'SupportConfiguration',
  TenantSupportRouting: 'TenantSupportRouting',
  OutboxEvent: 'OutboxEvent',
  EmailProvider: 'EmailProvider',
  AuditEvent: 'AuditEvent',
  InboxEvent: 'InboxEvent',
  NotificationIntent: 'NotificationIntent',
  NotificationDelivery: 'NotificationDelivery',
  NotificationPreferences: 'NotificationPreferences',
  NotificationTemplate: 'NotificationTemplate'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
