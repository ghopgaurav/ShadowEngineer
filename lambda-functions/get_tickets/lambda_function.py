"""
Lambda Function: get_tickets
Bedrock Agent Action - Get available Jira tickets
"""

import json
import boto3
import os

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'onboarding-copilot-docs')

def lambda_handler(event, context):
    """
    Get available Jira tickets for onboarding.
    
    This is called by Bedrock Agent when it needs ticket information.
    """
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Try to get from S3 first
        try:
            response = s3_client.get_object(
                Bucket=BUCKET_NAME,
                Key='docs/sample_jira_tickets.json'
            )
            tickets = json.loads(response['Body'].read().decode('utf-8'))
        except:
            # Fallback to hardcoded tickets
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
        
        # Format response for Bedrock Agent
        response_body = {
            "application/json": {
                "body": json.dumps({
                    "success": True,
                    "tickets": tickets,
                    "count": len(tickets)
                })
            }
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(response_body)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                "application/json": {
                    "body": json.dumps({
                        "success": False,
                        "error": str(e)
                    })
                }
            })
        }
