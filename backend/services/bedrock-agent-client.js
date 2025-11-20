// Bedrock Agent Client - True Agent Integration
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });

/**
 * Invoke Bedrock Agent to process standup transcript
 * 
 * The agent will autonomously:
 * 1. Analyze the transcript
 * 2. Decide which MCP tools to call (get_tickets, get_docs, get_glossary)
 * 3. Generate beginner-friendly summary
 * 4. Save the summary using write_summary tool
 */
async function processStandupWithAgent(transcript, userId = 'new_joiner', sessionId = null) {
  try {
    const agentId = process.env.BEDROCK_AGENT_ID;
    const agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID;
    
    if (!agentId || !agentAliasId) {
      throw new Error('BEDROCK_AGENT_ID and BEDROCK_AGENT_ALIAS_ID must be set in .env');
    }
    
    const actualSessionId = sessionId || `session-${Date.now()}`;
    
    const prompt = `Process this standup transcript for new joiner "${userId}":

${transcript}

Please:
1. Use get_tickets() to see available tasks
2. Use get_docs() to understand the architecture
3. Use get_glossary() to explain technical terms
4. Generate a beginner-friendly summary
5. Use write_summary() to save the result

Focus on what the new joiner should know and do.`;

    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId,
      sessionId: actualSessionId,
      inputText: prompt
    });

    console.log('🤖 Invoking Bedrock Agent...');
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Session: ${actualSessionId}`);

    const response = await client.send(command);
    
    // Process streaming response
    let fullResponse = '';
    let toolCalls = [];
    
    for await (const event of response.completion) {
      if (event.chunk) {
        const chunk = new TextDecoder().decode(event.chunk.bytes);
        fullResponse += chunk;
      }
      
      // Track tool invocations
      if (event.trace) {
        const trace = event.trace;
        if (trace.orchestrationTrace) {
          const orch = trace.orchestrationTrace;
          if (orch.invocationInput) {
            toolCalls.push({
              type: 'invocation',
              actionGroup: orch.invocationInput.actionGroupInvocationInput?.actionGroupName,
              function: orch.invocationInput.actionGroupInvocationInput?.function
            });
          }
        }
      }
    }

    console.log('✅ Agent completed processing');
    console.log(`   Tools called: ${toolCalls.length}`);
    
    return {
      success: true,
      response: fullResponse,
      sessionId: actualSessionId,
      toolCalls,
      agentUsed: true
    };

  } catch (error) {
    console.error('❌ Bedrock Agent error:', error);
    return {
      success: false,
      error: error.message,
      agentUsed: true
    };
  }
}

/**
 * Continue conversation with agent
 */
async function continueConversation(message, sessionId) {
  try {
    const agentId = process.env.BEDROCK_AGENT_ID;
    const agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID;

    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId,
      sessionId,
      inputText: message
    });

    const response = await client.send(command);
    
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
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processStandupWithAgent,
  continueConversation
};
