import type {
  Event,
  ChannelConfig,
  ChannelRoutingRule,
} from './types.js';

/**
 * Channel Router handles routing events to appropriate realtime channels
 */
export class ChannelRouter {
  private routingRules: ChannelRoutingRule[] = [];

  constructor(private readonly channels: ChannelConfig[]) {
    this.buildRoutingRules();
  }

  /**
   * Build routing rules from channel configurations
   */
  private buildRoutingRules(): void {
    for (const channel of this.channels) {
      for (const eventType of channel.eventTypes) {
        this.routingRules.push({
          eventPattern: eventType,
          channelTemplate: channel.pattern,
          extractVariables: this.createVariableExtractor(channel.pattern),
          condition: undefined, // Can be added for more complex routing
        });
      }
    }

    console.log(`📋 Built ${this.routingRules.length} routing rules from ${this.channels.length} channel configs`);
  }

  /**
   * Route an event to appropriate channels
   */
  routeEvent(event: Event): string[] {
    const matchingChannels: string[] = [];

    for (const rule of this.routingRules) {
      if (this.eventMatches(event.eventName, rule.eventPattern)) {
        // Check additional condition if specified
        if (rule.condition && !rule.condition(event)) {
          continue;
        }

        // Extract variables and build channel name
        const variables = rule.extractVariables ? rule.extractVariables(event) : {};
        const channelName = this.interpolateChannelName(rule.channelTemplate, variables, event);
        
        if (channelName && !matchingChannels.includes(channelName)) {
          matchingChannels.push(channelName);
        }
      }
    }

    console.log(`🎯 Event ${event.eventName} routed to ${matchingChannels.length} channels:`, matchingChannels);
    return matchingChannels;
  }

  /**
   * Check if an event name matches a pattern
   */
  private eventMatches(eventName: string, pattern: string): boolean {
    // Convert glob-style pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]*')
      .replace(/\+/g, '[^.]+')
      .replace(/#/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }

  /**
   * Create a variable extractor function for a channel pattern
   */
  private createVariableExtractor(pattern: string): (event: Event) => Record<string, string> {
    return (event: Event) => {
      const variables: Record<string, string> = {};
      
      // Standard variables available from event
      if (event.tenantId) {
        variables.tenantId = event.tenantId;
      }
      
      if (event.createdBy) {
        variables.userId = event.createdBy;
        variables.createdBy = event.createdBy;
      }

      // Extract variables from payload
      if (event.payload) {
        // Common payload fields
        if (event.payload.userId) {
          variables.userId = String(event.payload.userId);
        }
        if (event.payload.targetUserId) {
          variables.targetUserId = String(event.payload.targetUserId);
        }
        if (event.payload.recipientId) {
          variables.recipientId = String(event.payload.recipientId);
        }
        if (event.payload.organizationId) {
          variables.organizationId = String(event.payload.organizationId);
        }
      }

      // Extract event type components
      const eventParts = event.eventName.split('.');
      variables.eventDomain = eventParts[0] || '';
      variables.eventAction = eventParts[eventParts.length - 1] || '';

      return variables;
    };
  }

  /**
   * Interpolate channel name template with variables
   */
  private interpolateChannelName(
    template: string,
    variables: Record<string, string>,
    event: Event
  ): string | null {
    let channelName = template;

    // Replace variable placeholders
    const placeholderRegex = /\{([^}]+)\}/g;
    const matches = channelName.match(placeholderRegex);

    if (matches) {
      for (const match of matches) {
        const variableName = match.slice(1, -1); // Remove { }
        const value = variables[variableName];
        
        if (value) {
          channelName = channelName.replace(match, value);
        } else {
          // Required variable is missing
          console.warn(`⚠️ Missing variable ${variableName} for channel template ${template}, event: ${event.eventName}`);
          return null;
        }
      }
    }

    return channelName;
  }

  /**
   * Get all configured channels
   */
  getChannelConfigs(): ChannelConfig[] {
    return [...this.channels];
  }

  /**
   * Get routing rules (for debugging/monitoring)
   */
  getRoutingRules(): ChannelRoutingRule[] {
    return [...this.routingRules];
  }

  /**
   * Add a new routing rule dynamically
   */
  addRoutingRule(rule: ChannelRoutingRule): void {
    this.routingRules.push(rule);
    console.log(`➕ Added new routing rule: ${rule.eventPattern} -> ${rule.channelTemplate}`);
  }

  /**
   * Remove routing rules by pattern
   */
  removeRoutingRules(eventPattern: string): number {
    const initialCount = this.routingRules.length;
    this.routingRules = this.routingRules.filter(rule => rule.eventPattern !== eventPattern);
    const removedCount = initialCount - this.routingRules.length;
    
    if (removedCount > 0) {
      console.log(`➖ Removed ${removedCount} routing rules for pattern: ${eventPattern}`);
    }
    
    return removedCount;
  }
}