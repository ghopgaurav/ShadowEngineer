// Optional: Bedrock Agent Integration (Production Version)
// This shows how to use Bedrock Agents with MCP tools as Lambda functions

const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });

/**
 * Invoke Bedrock Agent with MCP tools
 * 
 * This is the PRODUCTION approach where:
 * 1. Agent receives a request
 * 2. Agent autonomously decides which MCP tools to call
 * 3. Agent calls Lambda functions (MCP tools)
 * 4. Agent synthesizes results and returns
 * 
 * Prerequisites:
 * - Deploy MCP tools as Lambda functions
 * - Create Bedrock Agent in AWS Console
 * - Configure action groups with OpenAPI schemas
 * - Link Lambda functions to agent
 */
async function invokeAgentWithMCPTools({ agentId, agentAliasId, sessionId, prompt }) {
  try {
    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId,
      sessionId,
      inputText: prompt
    });

    const response = await client.send(command);
    
    // Handle streaming response
    let fullResponse = '';
    for await (const event of response.completion) {
      if (event.chunk) {
        const chunk = new TextDecoder().decode(event.chunk.bytes);
        fullResponse += chunk;
      }
    }

    return {
      success: true,
      response: fullResponse,
      sessionId
    };
  } catch (error) {
    console.error('Bedrock Agent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate onboarding plan using Bedrock Agent
 * 
 * The agent will:
 * 1. Call get_docs_from_s3 tool
 * 2. Call get_jira_sample tool
 * 3. Call get_thoropass_requirements tool
 * 4. Generate personalized plan
 * 5. Call write_onboarding_plan tool
 */
async function generateOnboardingPlanWithAgent({ role, background, sessionId }) {
  const prompt = `
    Generate a personalized 14-day onboarding plan for a ${role}.
    
    Engineer background: ${background}
    
    Steps:
    1. Fetch architecture documentation
    2. Get available Jira tickets
    3. Get compliance requirements
    4. Create a structured plan with:
       - Daily learning goals
       - Specific tasks
       - Compliance items
       - Checkpoints
    5. Save the plan
    
    Return the plan as JSON.
  `;

  return await invokeAgentWithMCPTools({
    agentId: process.env.BEDROCK_AGENT_ID,
    agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
    sessionId: sessionId || `session-${Date.now()}`,
    prompt
  });
}

/**
 * Analyze progress and detect blockers using Agent
 */
async function analyzeProgressWithAgent({ progressLogs, sessionId }) {
  const prompt = `
    Analyze these progress logs and identify blockers:
    
    ${JSON.stringify(progressLogs, null, 2)}
    
    Steps:
    1. Review all progress entries
    2. Identify patterns of being stuck
    3. Detect recurring issues
    4. Suggest specific solutions
    
    Return analysis as JSON with blockers and suggestions.
  `;

  return await invokeAgentWithMCPTools({
    agentId: process.env.BEDROCK_AGENT_ID,
    agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
    sessionId: sessionId || `session-${Date.now()}`,
    prompt
  });
}

/**
 * Generate manager summary using Agent
 */
async function generateManagerSummaryWithAgent({ sessionId }) {
  const prompt = `
    Generate a manager summary for the onboarding progress.
    
    Steps:
    1. Get all progress logs
    2. Get compliance logs
    3. Analyze completion rates
    4. Identify risks
    5. Predict ramp-up timeline
    
    Return summary as JSON with metrics and insights.
  `;

  return await invokeAgentWithMCPTools({
    agentId: process.env.BEDROCK_AGENT_ID,
    agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
    sessionId: sessionId || `session-${Date.now()}`,
    prompt
  });
}

// Configuration for Bedrock Agent
const AGENT_CONFIG = {
  // Agent instructions (set in AWS Console)
  instructions: `
    You are an AI onboarding assistant that helps new engineers get up to speed.
    
    You have access to these tools:
    - get_docs_from_s3: Fetch documentation from S3
    - get_jira_sample: Get starter Jira tickets
    - get_thoropass_requirements: Get compliance requirements
    - write_onboarding_plan: Save generated plans
    - log_progress: Record progress updates
    - get_progress: Retrieve progress logs
    - log_compliance: Track compliance completion
    - generate_compliance_evidence: Create audit packages
    
    Use these tools to:
    1. Create personalized onboarding plans
    2. Track engineer progress
    3. Detect blockers and suggest solutions
    4. Ensure compliance requirements are met
    5. Generate manager summaries
    
    Always be helpful, clear, and proactive in identifying issues.
  `,
  
  // Action groups (MCP tools as Lambda functions)
  actionGroups: [
    {
      name: 'DocumentTools',
      description: 'Tools for fetching and storing documents',
      functions: ['get_docs_from_s3', 'write_onboarding_plan']
    },
    {
      name: 'ProgressTools',
      description: 'Tools for tracking progress',
      functions: ['log_progress', 'get_progress']
    },
    {
      name: 'ComplianceTools',
      description: 'Tools for compliance management',
      functions: ['get_thoropass_requirements', 'log_compliance', 'generate_compliance_evidence']
    },
    {
      name: 'TaskTools',
      description: 'Tools for task management',
      functions: ['get_jira_sample']
    }
  ]
};

module.exports = {
  invokeAgentWithMCPTools,
  generateOnboardingPlanWithAgent,
  analyzeProgressWithAgent,
  generateManagerSummaryWithAgent,
  AGENT_CONFIG
};
