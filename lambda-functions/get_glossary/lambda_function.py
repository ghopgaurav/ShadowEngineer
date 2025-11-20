"""
Lambda Function: get_glossary
Bedrock Agent Action - Get team glossary
"""

import json

def lambda_handler(event, context):
    """
    Get team glossary with technical terms.
    """
    print(f"Event: {json.dumps(event)}")
    
    try:
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
            "PR": "Pull Request - code review process before merging changes",
            "CI/CD": "Continuous Integration/Continuous Deployment - automated testing and deployment",
            "IAM": "Identity and Access Management - AWS service for permissions"
        }
        
        response_body = {
            "application/json": {
                "body": json.dumps({
                    "success": True,
                    "glossary": glossary,
                    "term_count": len(glossary)
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
