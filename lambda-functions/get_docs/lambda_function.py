"""
Lambda Function: get_docs
Bedrock Agent Action - Get documentation from S3
"""

import json
import boto3
import os

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'onboarding-copilot-docs')

def lambda_handler(event, context):
    """
    Get documentation from S3.
    
    Parameters from Bedrock Agent:
    - doc_name: Name of the document to fetch
    """
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Extract parameters from Bedrock Agent event
        parameters = event.get('parameters', [])
        doc_name = 'architecture_overview.md'
        
        for param in parameters:
            if param.get('name') == 'doc_name':
                doc_name = param.get('value', doc_name)
        
        # Fetch from S3
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=f'docs/{doc_name}'
        )
        content = response['Body'].read().decode('utf-8')
        
        # Format response for Bedrock Agent
        response_body = {
            "application/json": {
                "body": json.dumps({
                    "success": True,
                    "content": content,
                    "doc_name": doc_name,
                    "source": "S3"
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
