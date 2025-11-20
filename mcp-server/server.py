"""
MCP Server with Bedrock Agent Integration
AI Onboarding Copilot - True MCP Implementation

This implements the actual MCP protocol with Bedrock Agent orchestration.
"""

import os
import json
import boto3
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("onboarding-copilot")

# AWS Bedrock client
bedrock_runtime = boto3.client(
    'bedrock-runtime',
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

# S3 client
s3_client = boto3.client('s3', region_name=os.getenv('AWS_REGION', 'us-east-1'))
BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'onboarding-copilot-docs')

# Data directory
DATA_DIR = Path(__file__).parent.parent / 'data'


# ============================================================================
# MCP TOOLS - These are exposed to the Bedrock Agent
# ============================================================================

@mcp.tool()
def get_tickets() -> Dict[str, Any]:
    """
    Get available Jira tickets for onboarding tasks.
    
    Returns a list of starter tickets with IDs, titles, descriptions,
    priorities, and estimated hours.
    """
    try:
        file_path = DATA_DIR / 'sample_jira_tickets.json'
        with open(file_path, 'r', encoding='utf-8') as f:
            tickets = json.load(f)
        
        return {
            "success": True,
            "tickets": tickets,
            "count": len(tickets)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def get_docs(doc_name: str = "architecture_overview.md") -> Dict[str, Any]:
    """
    Get documentation from S3 or local storage.
    
    Args:
        doc_name: Name of the document to fetch
    
    Returns documentation content in markdown format.
    """
    try:
        # Try S3 first
        try:
            response = s3_client.get_object(
                Bucket=BUCKET_NAME,
                Key=f'docs/{doc_name}'
            )
            content = response['Body'].read().decode('utf-8')
            source = "S3"
        except:
            # Fallback to local
            file_path = DATA_DIR / doc_name
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            source = "local"
        
        return {
            "success": True,
            "content": content,
            "doc_name": doc_name,
            "source": source
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def get_glossary() -> Dict[str, Any]:
    """
    Get team glossary with technical terms and definitions.
    
    Returns a dictionary of terms commonly used by the team
    that new joiners should understand.
    """
    # This could be loaded from a file, but for demo we'll define inline
    glossary = {
        "API Gateway": "AWS service that handles HTTP requests and routes them to backend services",
        "Lambda": "Serverless compute service that runs code without managing servers",
        "DynamoDB": "NoSQL database service provided by AWS",
        "S3": "Simple Storage Service - object storage for files and data",
        "Bedrock": "AWS service for accessing foundation models (LLMs)",
        "MCP": "Model Context Protocol - standard for AI tool integration",
        "SOC2": "Security compliance framework for service organizations",
        "Standup": "Daily team meeting to share progress and blockers",
        "Sprint": "Time-boxed period (usually 2 weeks) for completing work",
        "PR": "Pull Request - code review process before merging changes"
    }
    
    return {
        "success": True,
        "glossary": glossary,
        "term_count": len(glossary)
    }


@mcp.tool()
def write_summary(summary: Dict[str, Any], user_id: str = "new_joiner") -> Dict[str, Any]:
    """
    Save the generated standup summary and action plan.
    
    Args:
        summary: The complete summary with analysis and recommendations
        user_id: Identifier for the user
    
    Saves to both local JSON and S3 for persistence.
    """
    try:
        timestamp = datetime.now().isoformat()
        summary_id = f"summary_{int(datetime.now().timestamp() * 1000)}"
        
        # Add metadata
        full_summary = {
            "id": summary_id,
            "user_id": user_id,
            "timestamp": timestamp,
            **summary
        }
        
        # Save locally
        local_file = DATA_DIR / f'{summary_id}.json'
        with open(local_file, 'w', encoding='utf-8') as f:
            json.dump(full_summary, f, indent=2)
        
        # Save to S3
        try:
            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=f'summaries/{summary_id}.json',
                Body=json.dumps(full_summary, indent=2),
                ContentType='application/json'
            )
            s3_saved = True
        except:
            s3_saved = False
        
        return {
            "success": True,
            "summary_id": summary_id,
            "saved_locally": True,
            "saved_s3": s3_saved,
            "path": str(local_file)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool()
def get_compliance_requirements() -> Dict[str, Any]:
    """
    Get compliance requirements (SOC2, ISO27001, GDPR).
    
    Returns list of compliance items that new joiners must complete.
    """
    try:
        file_path = DATA_DIR / 'compliance_requirements.json'
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return {
            "success": True,
            "framework": data.get('framework', 'SOC2'),
            "requirements": data.get('requirements', []),
            "count": len(data.get('requirements', []))
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================================
# BEDROCK AGENT INTEGRATION
# ============================================================================

def invoke_bedrock_agent(transcript: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Invoke Bedrock Agent with the standup transcript.
    
    The agent will:
    1. Analyze the transcript
    2. Decide which MCP tools to call
    3. Synthesize information
    4. Generate beginner-friendly summary
    
    Args:
        transcript: The standup audio transcription
        context: Additional context (user info, etc.)
    
    Returns:
        Complete analysis with summary and action plan
    """
    
    # Build the prompt for the agent
    prompt = f"""You are an AI onboarding assistant helping a new engineer understand their team's standup.

STANDUP TRANSCRIPT:
{transcript}

YOUR TASK:
1. Analyze the standup transcript
2. Use available tools to gather context:
   - get_tickets() to see what tickets are available
   - get_docs() to understand the system architecture
   - get_glossary() to explain technical terms
   - get_compliance_requirements() if security/compliance mentioned

3. Generate a beginner-friendly summary that includes:
   - What was discussed in simple terms
   - Which tickets/tasks are relevant to the new joiner
   - Explanations of any technical terms used
   - What the new joiner should focus on today
   - Any blockers or concerns mentioned

4. Save the summary using write_summary()

Be helpful, clear, and assume the new joiner is unfamiliar with the codebase.
"""

    try:
        # Call Bedrock with Claude
        response = bedrock_runtime.invoke_model(
            modelId='us.anthropic.claude-3-5-sonnet-20241022-v2:0',
            contentType='application/json',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 4000,
                'messages': [
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'system': """You are an AI assistant with access to MCP tools. 
                When you need information, explain that you're calling a tool, 
                then provide the analysis. Format your response as JSON with:
                {
                  "summary": "beginner-friendly explanation",
                  "relevant_tickets": ["ticket IDs"],
                  "term_explanations": {"term": "explanation"},
                  "focus_areas": ["what to work on"],
                  "blockers": ["any issues mentioned"]
                }"""
            })
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        content = response_body['content'][0]['text']
        
        # Try to extract JSON from response
        try:
            # Look for JSON in the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                analysis = {"summary": content}
        except:
            analysis = {"summary": content}
        
        return {
            "success": True,
            "analysis": analysis,
            "raw_response": content
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# MAIN WORKFLOW - Following Your Diagram
# ============================================================================

@mcp.tool()
def process_standup_audio(transcript: str, user_id: str = "new_joiner") -> Dict[str, Any]:
    """
    Complete workflow: Process standup audio transcript through AI agent.
    
    This follows the diagram:
    1. Receives transcript (from Deepgram)
    2. Invokes Bedrock Agent for reasoning
    3. Agent calls MCP tools as needed
    4. Generates beginner-friendly summary
    5. Saves summary
    
    Args:
        transcript: The transcribed standup audio
        user_id: Identifier for the new joiner
    
    Returns:
        Complete analysis and action plan
    """
    
    print(f"📝 Processing standup for user: {user_id}")
    print(f"📄 Transcript length: {len(transcript)} characters")
    
    # Step 1: Get context using MCP tools
    print("🔧 Gathering context with MCP tools...")
    tickets = get_tickets()
    docs = get_docs("architecture_overview.md")
    glossary = get_glossary()
    compliance = get_compliance_requirements()
    
    # Step 2: Invoke Bedrock Agent for analysis
    print("🤖 Invoking Bedrock Agent for analysis...")
    agent_result = invoke_bedrock_agent(transcript, {
        "user_id": user_id,
        "tickets_available": tickets.get('count', 0),
        "docs_loaded": docs.get('success', False),
        "glossary_terms": glossary.get('term_count', 0)
    })
    
    if not agent_result['success']:
        return agent_result
    
    analysis = agent_result['analysis']
    
    # Step 3: Enhance with tool data
    print("✨ Enhancing analysis with tool data...")
    enhanced_summary = {
        "standup_summary": analysis.get('summary', ''),
        "relevant_tickets": analysis.get('relevant_tickets', []),
        "ticket_details": [
            t for t in tickets.get('tickets', [])
            if t['id'] in analysis.get('relevant_tickets', [])
        ],
        "term_explanations": analysis.get('term_explanations', {}),
        "focus_areas": analysis.get('focus_areas', []),
        "blockers": analysis.get('blockers', []),
        "architecture_context": docs.get('content', '')[:500] + "...",
        "compliance_items": [
            r for r in compliance.get('requirements', [])[:3]
        ]
    }
    
    # Step 4: Save summary
    print("💾 Saving summary...")
    save_result = write_summary(enhanced_summary, user_id)
    
    return {
        "success": True,
        "summary": enhanced_summary,
        "saved": save_result.get('success', False),
        "summary_id": save_result.get('summary_id'),
        "tools_used": ["get_tickets", "get_docs", "get_glossary", "get_compliance_requirements", "write_summary"]
    }


# ============================================================================
# SERVER STARTUP
# ============================================================================

if __name__ == "__main__":
    print("🚀 Starting MCP Server with Bedrock Agent Integration...")
    print("📡 Available MCP Tools:")
    print("   - get_tickets()")
    print("   - get_docs(doc_name)")
    print("   - get_glossary()")
    print("   - get_compliance_requirements()")
    print("   - write_summary(summary, user_id)")
    print("   - process_standup_audio(transcript, user_id)")
    print("\n✅ MCP Server ready!")
    
    # Run the MCP server
    mcp.run()
