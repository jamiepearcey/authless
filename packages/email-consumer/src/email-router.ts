import type {
  Event,
  EmailRoutingRule,
  ReactEmailTemplate,
} from './types.js';

/**
 * Email Router handles routing events to appropriate email templates
 */
export class EmailRouter {
  private routingRules: EmailRoutingRule[] = [];
  private templates: Map<string, ReactEmailTemplate> = new Map();

  constructor(
    routingRules: EmailRoutingRule[],
    templates: Map<string, ReactEmailTemplate>
  ) {
    this.routingRules = routingRules;
    this.templates = templates;
    this.validateRoutingRules();
  }

  /**
   * Validate that all routing rules reference valid templates
   */
  private validateRoutingRules(): void {
    for (const rule of this.routingRules) {
      if (!this.templates.has(rule.templateName)) {
        console.warn(`⚠️ Routing rule references unknown template: ${rule.templateName}`);
      }
    }
    console.log(`📋 Email router initialized with ${this.routingRules.length} routing rules and ${this.templates.size} templates`);
  }

  /**
   * Route an event to appropriate email templates
   */
  routeEvent(event: Event): Array<{
    template: ReactEmailTemplate;
    variables: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  }> {
    const matches: Array<{
      template: ReactEmailTemplate;
      variables: Record<string, any>;
      priority: 'low' | 'normal' | 'high' | 'urgent';
    }> = [];

    for (const rule of this.routingRules) {
      if (this.eventMatches(event.eventName, rule.eventPattern)) {
        // Check tenant-specific routing
        if (rule.tenantId && rule.tenantId !== event.tenantId) {
          continue;
        }

        // Check additional condition if specified
        if (rule.condition && !rule.condition(event)) {
          continue;
        }

        // Get the template
        const template = this.templates.get(rule.templateName);
        if (!template) {
          console.warn(`⚠️ Template not found for routing rule: ${rule.templateName}`);
          continue;
        }

        // Extract variables for the template
        const variables = rule.extractVariables(event);
        
        // Validate required variables
        const missingVariables = template.variables.filter(v => !variables[v]);
        if (missingVariables.length > 0) {
          console.warn(`⚠️ Template ${rule.templateName} missing required variables:`, missingVariables);
          continue;
        }

        matches.push({
          template,
          variables,
          priority: rule.priority,
        });
      }
    }

    // Sort by priority (high -> urgent -> normal -> low)
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    matches.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    console.log(`🎯 Event ${event.eventName} routed to ${matches.length} email templates`);
    return matches;
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
   * Get a template by name
   */
  getTemplate(name: string): ReactEmailTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Add a new template to the registry
   */
  addTemplate(template: ReactEmailTemplate): void {
    this.templates.set(template.name, template);
    console.log(`📧 Added email template: ${template.name}`);
  }

  /**
   * Remove a template from the registry
   */
  removeTemplate(name: string): boolean {
    const removed = this.templates.delete(name);
    if (removed) {
      console.log(`🗑️ Removed email template: ${name}`);
    }
    return removed;
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): ReactEmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    totalRules: number;
    totalTemplates: number;
    activeRules: number;
  } {
    const activeRules = this.routingRules.filter(rule => 
      this.templates.has(rule.templateName)
    ).length;

    return {
      totalRules: this.routingRules.length,
      totalTemplates: this.templates.size,
      activeRules,
    };
  }
}
