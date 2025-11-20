"""
Lambda Function: Bedrock Agent Router
Routes Bedrock Agent action group requests to appropriate handlers
"""

import json
import boto3
import os
from datetime import datetime

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'onboarding-copilot-docs')

def get_tickets():
    """Get available Jira tickets"""
    try:
        print(f"Attempting to fetch tickets from S3: s3://{BUCKET_NAME}/docs/sample_jira_tickets.json")
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key='docs/sample_jira_tickets.json'
        )
        tickets = json.loads(response['Body'].read().decode('utf-8'))
        print(f"Successfully fetched {len(tickets)} tickets from S3")
    except Exception as e:
        print(f"Failed to fetch from S3: {str(e)}. Using fallback data.")
        tickets = [
            {
                "id": "BE-101",
                "title": "Set up local development environment",
                "description": "Install Node.js, Docker, and configure AWS CLI",
                "priority": "High",
                "estimatedHours": 4
            },
            {
                "id": "BE-102",
                "title": "Understand API Gateway architecture",
                "description": "Review API Gateway setup and routing logic",
                "priority": "High",
                "estimatedHours": 6
            },
            {
                "id": "BE-103",
                "title": "Set up DynamoDB local",
                "description": "Configure local DynamoDB for development",
                "priority": "Medium",
                "estimatedHours": 3
            }
        ]
    
    return {
        "success": True,
        "tickets": tickets,
        "count": len(tickets)
    }

def get_docs(doc_name="architecture_overview.md"):
    """Get documentation from S3"""
    try:
        print(f"Attempting to fetch doc from S3: s3://{BUCKET_NAME}/docs/{doc_name}")
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=f'docs/{doc_name}'
        )
        content = response['Body'].read().decode('utf-8')
        print(f"Successfully fetched document: {doc_name} ({len(content)} bytes)")
        
        return {
            "success": True,
            "content": content,
            "doc_name": doc_name,
            "source": f"s3://{BUCKET_NAME}/docs/{doc_name}"
        }
    except Exception as e:
        print(f"Failed to fetch document from S3: {str(e)}")
        return {
            "success": False,
            "error": f"Document not found: {str(e)}",
            "doc_name": doc_name
        }

def get_glossary():
    """Get team glossary"""
    try:
        print(f"Attempting to fetch glossary from S3: s3://{BUCKET_NAME}/docs/team_glossary.json")
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key='docs/team_glossary.json'
        )
        glossary = json.loads(response['Body'].read().decode('utf-8'))
        print(f"Successfully fetched glossary with {len(glossary)} terms from S3")
    except Exception as e:
        print(f"Failed to fetch glossary from S3: {str(e)}. Using fallback data.")
        glossary = {
            "API Gateway": "AWS service that handles HTTP requests and routes them to backend services",
            "Lambda": "Serverless compute service that runs code without managing servers",
            "DynamoDB": "NoSQL database service provided by AWS",
            "S3": "Simple Storage Service - object storage in the cloud",
            "Cognito": "AWS service for user authentication and authorization",
            "JWT": "JSON Web Token - a secure way to transmit information between parties"
        }
    
    return {
        "success": True,
        "glossary": glossary,
        "term_count": len(glossary)
    }

def write_summary(summary, user_id="new_joiner"):
    """Save standup summary to S3"""
    try:
        timestamp = datetime.now().isoformat()
        summary_id = f"{user_id}_{timestamp}"
        key = f"summaries/{summary_id}.json"
        
        print(f"Attempting to write summary to S3: s3://{BUCKET_NAME}/{key}")
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=json.dumps(summary, indent=2),
            ContentType='application/json'
        )
        print(f"Successfully wrote summary to S3")
        
        return {
            "success": True,
            "summary_id": summary_id,
            "saved_s3": True,
            "location": f"s3://{BUCKET_NAME}/{key}"
        }
    except Exception as e:
        print(f"Failed to write summary to S3: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "saved_s3": False
        }

def lambda_handler(event, context):
    """
    Main handler for Bedrock Agent requests.
    Supports both function schema and API schema formats.
    """
    print(f"Received event: {json.dumps(event)}")
    
    try:
        # Extract the action/operation from the event
        api_path = event.get('apiPath', '')
        action_group = event.get('actionGroup', '')
        function_name = event.get('function', '')  # For function schema
        http_method = event.get('httpMethod', 'POST')
        message_version = event.get('messageVersion', '1.0')
        
        # Get parameters - function schema uses 'parameters' directly
        request_body = {}
        if 'parameters' in event:
            # Function schema format
            params = event.get('parameters', [])
            for param in params:
                request_body[param.get('name', '')] = param.get('value', '')
        elif 'requestBody' in event:
            # API schema format
            if 'content' in event['requestBody']:
                content = event['requestBody']['content']
                if 'application/json' in content:
                    body_str = content['application/json']['body']
                    if isinstance(body_str, str):
                        request_body = json.loads(body_str) if body_str else {}
                    else:
                        request_body = body_str
        
        print(f"Routing request - function: {function_name}, apiPath: {api_path}, actionGroup: {action_group}")
        print(f"Request body/parameters: {json.dumps(request_body)}")
        
        # Route to appropriate handler based on function name or apiPath
        result = None
        
        if function_name == 'getTickets' or api_path == '/get-tickets':
            print("Calling get_tickets()")
            result = get_tickets()
        elif function_name == 'getDocs' or api_path == '/get-docs':
            doc_name = request_body.get('doc_name', 'architecture_overview.md')
            print(f"Calling get_docs({doc_name})")
            result = get_docs(doc_name)
        elif function_name == 'getGlossary' or api_path == '/get-glossary':
            print("Calling get_glossary()")
            result = get_glossary()
        elif function_name == 'writeSummary' or api_path == '/write-summary':
            summary = request_body.get('summary', {})
            user_id = request_body.get('user_id', 'new_joiner')
            print(f"Calling write_summary(user_id={user_id})")
            result = write_summary(summary, user_id)
        else:
            print(f"Unknown operation - function: {function_name}, apiPath: {api_path}")
            result = {
                "success": False,
                "error": f"Unknown operation. function={function_name}, apiPath={api_path}"
            }
        
        print(f"Handler result: {json.dumps(result)}")
        
        # Format response for Bedrock Agent
        # For function schema, we don't include apiPath
        if function_name:
            # Function schema response format
            response = {
                'messageVersion': message_version,
                'response': {
                    'actionGroup': action_group,
                    'function': function_name,
                    'functionResponse': {
                        'responseBody': {
                            'TEXT': {
                                'body': json.dumps(result)
                            }
                        }
                    }
                }
            }
        else:
            # API schema response format
            response = {
                'messageVersion': message_version,
                'response': {
                    'actionGroup': action_group,
                    'apiPath': api_path,
                    'httpMethod': http_method,
                    'httpStatusCode': 200,
                    'responseBody': {
                        'application/json': {
                            'body': json.dumps(result)
                        }
                    }
                }
            }
        
        print(f"Returning response: {json.dumps(response)}")
        return response
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Check if using function schema or API schema
        function_name = event.get('function', '')
        
        if function_name:
            # Function schema error response
            return {
                'messageVersion': event.get('messageVersion', '1.0'),
                'response': {
                    'actionGroup': event.get('actionGroup', ''),
                    'function': function_name,
                    'functionResponse': {
                        'responseBody': {
                            'TEXT': {
                                'body': json.dumps({
                                    "success": False,
                                    "error": str(e)
                                })
                            }
                        }
                    }
                }
            }
        else:
            # API schema error response
            return {
                'messageVersion': event.get('messageVersion', '1.0'),
                'response': {
                    'actionGroup': event.get('actionGroup', ''),
                    'apiPath': event.get('apiPath', ''),
                    'httpMethod': event.get('httpMethod', 'POST'),
                    'httpStatusCode': 500,
                    'responseBody': {
                        'application/json': {
                            'body': json.dumps({
                                "success": False,
                                "error": str(e)
                            })
                        }
                    }
                }
            }
