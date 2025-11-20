# Lambda Functions for Bedrock Agent Integration

## Overview

These Lambda functions represent the **production version** of MCP tools that can be invoked by AWS Bedrock Agents.

## Current vs. Production Architecture

### Current (Hackathon Demo)
```
Frontend → Backend → MCP Tools (direct Node.js calls)
                  → Bedrock (for AI)
```

### Production (Bedrock Agent)
```
Frontend → Backend → Bedrock Agent
                          ↓
                     Lambda Functions (MCP Tools)
                          ↓
                     S3, DynamoDB, etc.
```

## Lambda Functions

### 1. get-docs-from-s3.js ✅
Fetches documentation from S3 bucket

**Input:**
```json
{
  "filename": "architecture_overview.md"
}
```

**Output:**
```json
{
  "success": true,
  "content": "# Architecture...",
  "filename": "architecture_overview.md"
}
```

### 2. get-jira-sample.js
Gets sample Jira tickets

### 3. write-onboarding-plan.js
Saves generated onboarding plan to S3

### 4. log-progress.js
Records daily progress updates

### 5. get-progress.js
Retrieves all progress logs

### 6. get-thoropass-requirements.js
Fetches compliance requirements

### 7. log-compliance.js
Tracks compliance item completion

### 8. generate-compliance-evidence.js
Creates audit evidence package

## Deployment

### Step 1: Package Lambda Function

```bash
cd lambda-functions
zip -r get-docs-from-s3.zip get-docs-from-s3.js node_modules/
```

### Step 2: Create Lambda Function

```bash
aws lambda create-function \
  --function-name onboarding-get-docs-from-s3 \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler get-docs-from-s3.handler \
  --zip-file fileb://get-docs-from-s3.zip \
  --environment Variables="{S3_BUCKET_NAME=your-bucket-name}"
```

### Step 3: Grant Permissions

```bash
# Allow Lambda to read from S3
aws lambda add-permission \
  --function-name onboarding-get-docs-from-s3 \
  --statement-id bedrock-agent-invoke \
  --action lambda:InvokeFunction \
  --principal bedrock.amazonaws.com
```

### Step 4: Create Bedrock Agent

1. Go to AWS Console → Bedrock → Agents
2. Click "Create Agent"
3. Name: "onboarding-copilot-agent"
4. Model: Claude 3.5 Sonnet
5. Instructions: (see bedrock-agent.js)

### Step 5: Add Action Group

1. In agent configuration, click "Add action group"
2. Name: "DocumentTools"
3. Action group type: "Define with API schemas"
4. Upload OpenAPI schema (from Lambda file)
5. Select Lambda function: onboarding-get-docs-from-s3
6. Save

### Step 6: Test Agent

```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id YOUR_AGENT_ID \
  --agent-alias-id YOUR_ALIAS_ID \
  --session-id test-session \
  --input-text "Fetch the architecture overview document"
```

## OpenAPI Schema Template

Each Lambda needs an OpenAPI schema for Bedrock Agent:

```yaml
openapi: 3.0.0
info:
  title: MCP Tool Name
  version: 1.0.0
paths:
  /tool-endpoint:
    post:
      summary: Tool description
      operationId: toolName
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                param1:
                  type: string
                  description: Parameter description
      responses:
        '200':
          description: Success response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
```

## IAM Role for Lambda

Create execution role with these policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Environment Variables

Each Lambda needs:
- `AWS_REGION` - AWS region
- `S3_BUCKET_NAME` - S3 bucket for storage
- `DYNAMODB_TABLE` - (optional) for structured data

## Testing Locally

Use AWS SAM for local testing:

```bash
sam local invoke GetDocsFromS3 -e test-event.json
```

## Cost Estimation

Per 1000 invocations:
- Lambda: $0.20
- Bedrock Agent: $0.50
- S3 requests: $0.01
- **Total: ~$0.71**

## When to Use This

**Use Lambda + Bedrock Agent when:**
- ✅ Building for production
- ✅ Need autonomous agent behavior
- ✅ Want scalability
- ✅ Have time for setup

**Use direct calls (current) when:**
- ✅ Building hackathon demo
- ✅ Need quick implementation
- ✅ Want simpler debugging
- ✅ Prototyping

## Migration Path

1. **Week 1:** Use current direct calls (done!)
2. **Week 2:** Deploy one Lambda as test
3. **Week 3:** Create Bedrock Agent
4. **Week 4:** Migrate all tools to Lambda
5. **Week 5:** Update backend to use agent
6. **Week 6:** Production deployment

## Summary

- ✅ Lambda functions = Production MCP tools
- ✅ Bedrock Agent = Autonomous AI orchestrator
- ✅ Current setup = Perfect for hackathon
- ✅ This folder = Upgrade path for later

**For your hackathon: Stick with current implementation!**
**For production: Use these Lambda functions.**
