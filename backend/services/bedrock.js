const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

async function generateOnboardingPlan({ role, background, architecture, tickets, compliance }) {
  const prompt = `You are an AI onboarding assistant. Generate a personalized 14-day onboarding plan.

Role: ${role}
Engineer Background: ${background}

Architecture Overview:
${architecture}

Available Starter Tickets:
${JSON.stringify(tickets, null, 2)}

Compliance Requirements:
${JSON.stringify(compliance, null, 2)}

Generate a structured 14-day plan with:
- Daily learning goals
- Specific tasks from the tickets
- Compliance items integrated naturally
- Checkpoints and milestones
- Personalized based on their background

Return as JSON with this structure:
{
  "days": [
    {
      "day": 1,
      "title": "...",
      "learningGoals": ["..."],
      "tasks": ["..."],
      "complianceItems": ["..."],
      "checkpoint": "..."
    }
  ]
}`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType: 'application/json',
    body: JSON.stringify(payload)
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const content = responseBody.content[0].text;
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { days: [] };
}


async function analyzeBlockers(progressLogs) {
  const prompt = `Analyze these progress logs and identify blockers and suggest solutions:

${JSON.stringify(progressLogs, null, 2)}

Return JSON with:
{
  "blockers": [
    {
      "issue": "...",
      "frequency": "...",
      "suggestions": ["..."]
    }
  ]
}`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  };

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType: 'application/json',
    body: JSON.stringify(payload)
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const content = responseBody.content[0].text;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { blockers: [] };
}

async function generateManagerSummary(progressLogs, complianceLogs) {
  const prompt = `Generate a manager summary based on:

Progress Logs:
${JSON.stringify(progressLogs, null, 2)}

Compliance Logs:
${JSON.stringify(complianceLogs, null, 2)}

Return JSON with:
{
  "completedTasks": [...],
  "skillsLearned": [...],
  "complianceStatus": "X%",
  "risks": [...],
  "predictedRampUp": "..."
}`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  };

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType: 'application/json',
    body: JSON.stringify(payload)
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const content = responseBody.content[0].text;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

module.exports = {
  generateOnboardingPlan,
  analyzeBlockers,
  generateManagerSummary
};
